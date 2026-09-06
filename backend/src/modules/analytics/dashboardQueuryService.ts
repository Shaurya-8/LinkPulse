import { prisma } from "../../config/prisma";
import { cache, cacheKeys } from "../../config/redis";
import { UserId } from "../../types";
import { FeatureLimitUsedRepository } from "../links/features/featureLimitUsed/featureUsed-limit.repository";
import { LinkRepository } from "../links/links.repository";
import { AnalyticsRepository } from "./analytics.repository";

export class DashboardQueryService {

    linkRepository = new LinkRepository(prisma)
    // analyticsRepository = new AnalyticsRepository(prisma);
    limitRepository = new FeatureLimitUsedRepository(prisma)


    async getDashboardStats(userId: UserId): Promise<{ data: object }> {
        // const cacheKey = cacheKeys.dashboardStats(userId);
        // const cached = await cache.get<object>(cacheKey);
        // if (cached) return { data: cached };

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [totalLinks, activeLinks, userLinks, totalClicks30d, topLinks] = await Promise.all([
            this.linkRepository.countLinks(userId),
            this.linkRepository.countActive(userId),
            this.linkRepository.findMany({ where: { userId }, select: { id: true } }),
            this.limitRepository.countLastMonth(userId),
            this.linkRepository.findMany({
                where: { userId },
                select: {
                    id: true,
                    shortCode: true,
                    title: true,
                    longUrl: true,
                    clickCount: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { clickCount: 'desc' },
                take: 5,
            }),
        ]);

        const linkIds = (userLinks as Array<{ id: string }>).map((l) => l.id);
        const totalAllTimeClicks = await this.limitRepository.count({
            where: { linkId: { in: linkIds }, isBot: false },
        });

        const stats = {
            totalLinks,
            activeLinks,
            totalClicks: totalAllTimeClicks,
            clicksLast30Days: totalClicks30d,
            topLinks,
        };

        console.log("stats : ",{
            userId,
            totalLinks,
            activeLinks,
            userLinks,
        });

        return { data: stats }
    }
}