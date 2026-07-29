import { prisma } from "../../config/prisma";
import { cache, cacheKeys } from "../../config/redis";
import { Authorization } from "../Authorization";
import { LinkRepository } from "./links.repository";
import { validateUrl } from "./utils/validate-url";
import { normalizeUrl } from "./utils/normalize-url";
import { hashPassword } from "../../common/utils/crypto";
import { Prisma } from "../../../generated/prisma/client";
import { generateShortCode } from "./utils/generateShortCode";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError";
import { config } from "../../config";
import { buildShortUrl, formatLink } from "./utils/formatLink";
import { buildPaginationMeta } from "./utils/buildPaginateMetaData";
export class LinkService {
    linkRepository = new LinkRepository(prisma);
    authorization = new Authorization();
    async create(dto, device, userId) {
        const normalizedUrl = normalizeUrl(dto.longUrl);
        await validateUrl(normalizedUrl);
        const result = await prisma.$transaction(async (tx) => {
            if (userId) {
                await this.authorization.createLinkAuthorization({ ...dto, userId: userId }, tx);
            }
            const passwordHash = dto.passwordHash ? await hashPassword(dto.passwordHash) : undefined;
            dto = { ...dto, passwordHash: passwordHash };
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
                    return await this.linkRepository.createLink({
                        dto,
                        normalizedUrl: normalizedUrl, shortCode
                    }, userId, tx);
                }
                catch (error) {
                    if (error instanceof Prisma.PrismaClientKnownRequestError &&
                        error.code === "P2002") {
                        const target = error.meta?.target;
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
        });
        await cache.set(cacheKeys.shortLink(result.shortCode), result, config.link.ttl);
        return {
            data: {
                url: `${config.app.url}:${config.app.port}/${result.shortCode}`,
                expiresAt: result.expiresAt,
            }
        };
    }
    async getLinkByShortCode(shortCode, tx) {
        const cached = await cache.get(cacheKeys.shortLink(shortCode));
        if (cached)
            return { data: cached };
        const result = await this.linkRepository.findByShortCode(shortCode, tx);
        if (result) {
            await cache.set(cacheKeys.shortLink(shortCode), result, config.link.ttl);
        }
        return { data: result };
    }
    async getLink(id, userId, device) {
        const cached = await cache.get(cacheKeys.linkById(userId, id));
        if (cached)
            return { data: cached };
        const link = await this.linkRepository.findById(id, userId);
        if (!link) {
            throw new NotFoundError("Link");
        }
        return { data: link };
    }
    async updateLink(id, user, input, device) {
        const exist = await this.linkRepository.findById(id, user.id);
        if (!exist) {
            throw new NotFoundError("Link");
        }
        await this.authorization.updateLinkAuthorization(exist, user.id, user.role, input);
        if (input.password !== undefined) {
            throw new BadRequestError('Password protection requires a Premium account');
        }
        if (input.longUrl) {
            const normalized = normalizeUrl(input.longUrl);
            await validateUrl(normalized);
            input.longUrl = normalized;
        }
        let passwordHash;
        if (input.password) {
            passwordHash = await hashPassword(input.password);
        }
        const link = await this.linkRepository.update({
            where: { id },
            data: {
                ...(input.longUrl !== undefined && {
                    longUrl: input.longUrl,
                }),
                ...(input.title !== undefined && {
                    title: input.title,
                }),
                ...(input.description !== undefined && {
                    description: input.description,
                }),
                ...(passwordHash !== undefined && {
                    passwordHash,
                }),
                ...(input.expiresAt !== undefined && {
                    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                }),
                ...(input.clickLimit !== undefined && {
                    clickLimit: input.clickLimit,
                }),
                ...(input.redirectType !== undefined && {
                    redirectType: input.redirectType,
                }),
                ...(input.isActive !== undefined && {
                    isActive: input.isActive,
                }),
                ...(input.isOneTime !== undefined && {
                    isOneTime: input.isOneTime,
                }),
                ...(input.customAlias !== undefined && {
                    customAlias: input.customAlias,
                }),
            }
        });
        cache.del(cacheKeys.shortLink(exist.shortCode));
        cache.del(cacheKeys.linkById(user.id, id));
        return { data: this.formatLink(link) };
    }
    async toggleLinkIsActive(id, userId, device) {
        const link = await this.linkRepository.findFirst({
            where: { id, userId },
            select: { id: true, isActive: true, shortCode: true },
        });
        if (!link)
            throw new BadRequestError('Link');
        const isActive = link.isActive === true ? false : true;
        await this.linkRepository.update({ where: { id }, data: { isActive: isActive } });
        await cache.del(cacheKeys.shortLink(link.shortCode));
        await cache.del(cacheKeys.linkById(userId, id));
        return { data: { isActive } };
    }
    // ─────────────────────────────────────────────
    // Get Links (paginated)
    // ─────────────────────────────────────────────
    async getLinks(userId, query) {
        const { page, limit, search, isActive, tag, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;
        const where = {
            userId,
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { shortCode: { contains: search, mode: 'insensitive' } },
                    { longUrl: { contains: search, mode: 'insensitive' } },
                ],
            }),
            // ...(tag && { tags: { some: { name: { equals: tag, mode: 'insensitive' as const } } } }),
        };
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
        return {
            data: {
                links: links.map((l) => formatLink(l)),
                meta: buildPaginationMeta(total, page, limit),
            }
        };
    }
    async deleteLink(id, userId) {
        const link = await this.linkRepository.findById(id, userId);
        if (!link) {
            throw new NotFoundError('link');
        }
        await this.linkRepository.deleteLink(id);
        await cache.del(cacheKeys.shortLink(link.shortCode));
        await cache.del(cacheKeys.linkById(userId, link.shortCode));
        return;
    }
    async expireCode(shortCode, tx) {
        const result = await this.linkRepository.expireCode(shortCode, tx);
        if (result)
            cache.del(cacheKeys.shortLink(result.shortCode));
        return result;
    }
    formatLink(link) {
        return {
            id: link.id,
            shortCode: link.shortCode,
            shortUrl: buildShortUrl(link.shortCode),
            longUrl: link.longUrl,
            title: (link.title ?? null),
            description: (link.description ?? null),
            isActive: link.isActive,
            clickCount: link.clickCount ?? 0,
            clickLimit: (link.clickLimit ?? null),
            isPasswordProtected: !!link.passwordHash,
            expiresAt: (link.expiresAt ?? null),
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        };
    }
}
//# sourceMappingURL=links.service.js.map