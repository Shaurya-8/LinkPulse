import { Response } from "express";
import { prisma } from "../../config/prisma";
import { cache, cacheKeys } from "../../config/redis";
import { DeviceInfo, UserId } from "../../types";
import { Authorization } from "./Authorization";
import { LinkRepository } from "./links.repository";
import { CreateLinkDto } from "./links.schema";
import { validateUrl } from "./utils/validate-url";
import { normalizeUrl } from "./utils/normalize-url"
import { generateSecureToken } from "../../common/utils/crypto";
import { Prisma } from "../../../generated/prisma/client";
import { generateShortCode } from "./utils/generateShortCode"
import { BadRequestError, ConflictError } from "../../common/errors/AppError";
import { config } from "../../config";
import { ShortLinkResult } from "./links.repository";
export class LinkService {
    linkRepository = new LinkRepository(prisma);

    authorization = new Authorization();

    async create(dto: CreateLinkDto, device: DeviceInfo, userId?: UserId,) {
        console.log(dto);
        const url = validateUrl(dto.longUrl);
        const normalizedUrl = normalizeUrl(dto.longUrl);
        if (!userId) {
            // register as guest
            // create link
            return;
        }

        const result = await prisma.$transaction(async (tx) => {
            await this.authorization.createLinkAuthorization({ ...dto, userId: userId }, tx);

            let MAX_ATTEMPT = 5;
            if (dto.customAlias) MAX_ATTEMPT = 1;

            for (let attempt = 0; attempt < MAX_ATTEMPT; attempt++) {
                const shortCode = dto.customAlias ?? generateShortCode();

                try {
                    return await this.linkRepository.createLink(
                        {
                            dto,
                            normalizedUrl: normalizedUrl, shortCode
                        },
                        userId,
                        tx
                    );
                } catch (error) {
                    if (
                        error instanceof Prisma.PrismaClientKnownRequestError &&
                        error.code === "P2002"
                    ) {
                        const target = error.meta?.target as string[] | undefined;

                        if (target?.includes("short_code")) {
                            continue;
                        }

                        if (target?.includes("custom_alias")) {
                            throw new ConflictError("Alias already exists.");
                        }
                    }

                    throw error;
                }
            }
            throw new Error("Failed to generate a unique short code.");
        })

        await cache.set(cacheKeys.shortLink(result.shortCode), result, config.link.ttl);
        return {
            data: {
                url: `${config.app.url}:${config.app.port}/${result.shortCode}`,
                expiresAt: result.expiresAt,
            }
        }
    }


    async redirect(shortCode: string, res: Response, device?: DeviceInfo) {
        let result = await cache.get<ShortLinkResult>(cacheKeys.shortLink(shortCode));
        if (!result) {
            result = await this.linkRepository.findFirstLink(shortCode);
        }
        if (!result) {
            throw new BadRequestError("link not found")
        }

        if (result.passwordHash) {
            res.redirect('/password-verification');
        }
        if (result.isOneTime && result.clickLimit++ > 1) {
            throw new BadRequestError("Link not found");
        }
        
        return { longUrl: result.longUrl };

    }
}

