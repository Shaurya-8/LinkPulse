import { Response } from "express";
import { DbClient, prisma } from "../../config/prisma";
import { cache, cacheKeys } from "../../config/redis";
import { DeviceInfo, ParsedUserAgent, UserId } from "../../types";
import { Authorization } from "../Authorization";
import { LinkRepository } from "./links.repository";
import { CreateLinkInput, RedirectRuleInput, UpdateLinkInput } from "./links.schema";
import { validateUrl } from "./utils/validate-url";
import { normalizeUrl } from "./utils/normalize-url"
import { generateSecureToken, hashPassword, verifyPassword } from "../../common/utils/crypto";
import { Links, PlanType, Prisma, UserRole } from "../../../generated/prisma/client";
import { generateShortCode } from "./utils/generateShortCode"
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError";
import { config, link } from "../../config";
import { LinkWithRelations } from "./links.repository";
import { buildShortUrl, formatLink } from "./utils/formatLink";
import { buildPaginationMeta } from "./utils/buildPaginateMetaData";
import { GetLinksParams, LinkWithMeta } from "./links.type";


type User = {
    id: UserId,
    role: UserRole,
}

export class LinkService {
    linkRepository = new LinkRepository(prisma);

    authorization = new Authorization();

    async create(dto: CreateLinkInput, device: DeviceInfo, userId?: UserId,) {

        const normalizedUrl = normalizeUrl(dto.longUrl);
        await validateUrl(normalizedUrl);

        const result = await prisma.$transaction(async (tx) => {
            if (userId) {
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

    async getLink(id: string, userId: UserId, device: DeviceInfo): Promise<{ data: Links }> {
        const cached = await cache.get<Links>(cacheKeys.linkById(userId, id));
        if (cached) return { data: cached };

        const link = await this.linkRepository.findById(id, userId);

        if (!link) {
            throw new NotFoundError("Link");
        }
        return { data: link };
    }


    async updateLink(id: string, user: User, input: UpdateLinkInput, device: DeviceInfo): Promise<{ data: LinkWithMeta }> {


        const exist = await this.linkRepository.findById(id, user.id);
        if (!exist) {
            throw new NotFoundError("Link")
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

        let passwordHash: string | null | undefined;
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

    async toggleLinkIsActive(id: string, userId: UserId, device: DeviceInfo): Promise<{ data: { isActive: boolean } }> {
        const link = await this.linkRepository.findFirst({
            where: { id, userId },
            select: { id: true, isActive: true, shortCode: true },
        });
        if (!link) throw new BadRequestError('Link');

        const isActive = link.isActive === true ? false : true;
        await this.linkRepository.update({ where: { id }, data: { isActive: isActive as never } });
        await cache.del(cacheKeys.shortLink(link.shortCode));
        await cache.del(cacheKeys.linkById(userId, id));
        return { data: { isActive } };
    }

    // ─────────────────────────────────────────────
    // Get Links (paginated)
    // ─────────────────────────────────────────────

    async getLinks(userId: UserId, query: GetLinksParams): Promise<{ data: object }> {
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
        await cache.del(cacheKeys.linkById(userId, link.shortCode));
        return;

    }

    async expireCode(shortCode: string, tx?: DbClient) {
        const result = await this.linkRepository.expireCode(shortCode, tx);
        if (result) cache.del(cacheKeys.shortLink(result.shortCode));
        return result;
    }

    private formatLink(link: Record<string, unknown>): LinkWithMeta {
        return {
            id: link.id as string,
            shortCode: link.shortCode as string,
            shortUrl: buildShortUrl(link.shortCode as string),
            longUrl: link.longUrl as string,
            title: (link.title ?? null) as string | null,
            description: (link.description ?? null) as string | null,
            isActive: link.isActive as string,
            clickCount: (link.clickCount as number) ?? 0,
            clickLimit: (link.clickLimit ?? null) as number | null,
            isPasswordProtected: !!(link.passwordHash as string | null),
            expiresAt: (link.expiresAt ?? null) as Date | null,
            createdAt: link.createdAt as Date,
            updatedAt: link.updatedAt as Date,
        };
    }

    async setRedirectRules(linkId: string, userId: UserId, rules: RedirectRuleInput['rules']) {
        const link = await this.linkRepository.findById(linkId, userId);

        // const link = await prisma.link.findFirst({ where: { id: linkId, userId }, select: { shortCode: true } });
        if (!link) throw new NotFoundError('Link');

        await prisma.$transaction([
            prisma.redirectRule.deleteMany({ where: { linkId } }),
            prisma.redirectRule.createMany({
                data: rules.map((r) => ({
                    linkId,
                    conditionType: r.conditionType,
                    conditionValue: r.conditionValue,
                    targetUrl: r.targetUrl,
                    label: r.label,
                    priority: r.priority,
                    isActive: r.isActive,
                })),
            }),
        ]);

        await cache.del(cacheKeys.shortLink(link.shortCode));
    }

    async createAbTest(linkId: string, userId: UserId, name: string, variants: Array<{ name: string; url: string; weight: number }>): Promise<{ data: object }> {

        const link = await this.linkRepository.findById(linkId, userId);

        if (!link) throw new NotFoundError('Link');

        await prisma.aBTest.updateMany({
            where: { linkId },
            data: { isActive: false }
        });

        const test = await prisma.aBTest.create({
            data: {
                linkId,
                name,
                variants:
                    { create: variants }
            },
            include: { variants: true },
        });

        await cache.del(cacheKeys.shortLink(link.shortCode));
        return { data: test };
    }

    // async bulkCreate(input: { links: Array<{ originalUrl: string; customAlias?: string; title?: string; expiresAt?: string; tags?: string[] }> }, userId: string): Promise<{ jobId: string; totalLinks: number; message: string }> {
    //     this.linkRepository
    //     const job = await prisma.bulkJob.create({
    //         data: { userId, totalLinks: input.links.length, status: 'PENDING' as never },
    //     });
    //     await enqueueBulkJob({ jobId: job.id, userId, links: input.links });
    //     return { jobId: job.id, totalLinks: input.links.length, message: 'Bulk job queued.' };
    // }

    // async getBulkJobStatus(jobId: string, userId: string): Promise<object> {
    //     const job = await prisma.bulkJob.findFirst({ where: { id: jobId, userId } });
    //     if (!job) throw new AppError(404, 'Bulk job not found');
    //     return {
    //         id: job.id, status: job.status,
    //         totalLinks: job.totalLinks, processed: job.processed, failed: job.failed,
    //         progress: job.totalLinks > 0 ? Math.round((job.processed / job.totalLinks) * 100) : 0,
    //         results: job.resultData ? JSON.parse(job.resultData) : null,
    //         createdAt: job.createdAt, updatedAt: job.updatedAt,
    //     };
    // }

}

