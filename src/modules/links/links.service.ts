import { Response } from "express";
import { DbClient, prisma } from "../../config/prisma";
import { cache, cacheKeys } from "../../config/redis";
import { DeviceInfo, ParsedUserAgent, UserId } from "../../types";
import { Authorization } from "../Authorization";
import { LinkRepository } from "./links.repository";
import { CreateLinkInput } from "./links.schema";
import { validateUrl } from "./utils/validate-url";
import { normalizeUrl } from "./utils/normalize-url"
import { generateSecureToken, hashPassword, verifyPassword } from "../../common/utils/crypto";
import { Prisma } from "../../../generated/prisma/client";
import { generateShortCode } from "./utils/generateShortCode"
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError";
import { config } from "../../config";
import { LinkWithRelations } from "./links.repository";
import { formatLink } from "./utils/formatLink";
import { buildPaginationMeta } from "./utils/buildPaginateMetaData";
import { GetLinksParams } from "./links.type";
import { boolean } from "zod";


export class LinkService {
    linkRepository = new LinkRepository(prisma);

    authorization = new Authorization();

    async create(dto: CreateLinkInput, device: DeviceInfo, userId?: UserId,) {
        console.log(dto);
        const url = validateUrl(dto.longUrl);
        const normalizedUrl = normalizeUrl(dto.longUrl);

        console.log("userId: ", userId)
        const result = await prisma.$transaction(async (tx) => {
            if(userId){
                await this.authorization.createLinkAuthorization({ ...dto, userId: userId }, tx);
            }

            const passwordHash = dto.passwordHash ? await hashPassword(dto.passwordHash) : undefined;
            dto = { ...dto, passwordHash: passwordHash }

            let MAX_ATTEMPT = 5;

            if (dto.customAlias) {
                const exist = this.linkRepository.findByShortCode(dto.customAlias);
                if (!!exist) {
                    throw new BadRequestError("Alias already taken");
                }
                MAX_ATTEMPT = 1;
            }


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


    async getLinkByShortCode(shortCode: string, tx?: DbClient): Promise<{ data: LinkWithRelations | null }> {
        const cached = await cache.get<LinkWithRelations>(cacheKeys.shortLink(shortCode));
        if (cached) return { data: cached };

        const result = await this.linkRepository.findByShortCode(shortCode, tx)
        if (result) {
            await cache.set(cacheKeys.shortLink(shortCode), result, config.link.ttl);
        }
        return { data: result };
    }


    // ─────────────────────────────────────────────
    // Get Links (paginated)
    // ─────────────────────────────────────────────

    async getLinks(userId: string, query: GetLinksParams): Promise<{ data: object }> {
        const { page, limit, search, isActive, tag, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        const where = {
            userId,
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { shortCode: { contains: search, mode: 'insensitive' as const } },
                    { longUrl: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            // ...(tag && { tags: { some: { name: { equals: tag, mode: 'insensitive' as const } } } }),
        };

        console.log("getlinks where  ", JSON.stringify(where, null, 2));
        const [total, links] = await Promise.all([
            this.linkRepository.count({ where }),
            this.linkRepository.findMany({
                where,
                // include: { tags: true, qrCode: { select: { pngUrl: true, svgData: true } } },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
        ]);

        console.log(links, " ", total, " ", page, " ", limit);
        return {
            data: {
                links: links.map((l: Record<string, unknown>) => formatLink(l)),
                meta: buildPaginationMeta(total, page, limit),
            }
        };
    }



    async deleteLink(id: string, userId: UserId): Promise<void> {
        const link = await this.linkRepository.findById(id, userId);
        if (!link) {
            throw new NotFoundError('link');
        }
        await this.linkRepository.deleteLink(id);
        await cache.del(cacheKeys.shortLink(link.shortCode));

    }

    async expireCode(shortCode: string, tx?: DbClient) {
        const result = await this.linkRepository.expireCode(shortCode, tx);
        if (result) cache.del(cacheKeys.shortLink(result.shortCode));
        return result;
    }


}

