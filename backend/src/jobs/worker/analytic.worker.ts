import { Worker, Job } from "bullmq";
import { cache, cacheKeys, redisClient } from "../../config/redis";
import { config } from "../../config";
import { logger } from "../../common/utils/logger";
import { AnalyticsJobData } from "../../types";
import { jobType } from "../enums";
import { parseUserAgent } from "../../common/utils/useragent";
import { extractIP, lookupGeo } from "../../common/utils/geoip";
import { prisma } from "../../config/prisma";
import ua from "zod/v4/locales/ua.js";


let worker: Worker | null = null;

export function createAnalyticsWorker(): Worker {

    worker = new Worker<AnalyticsJobData>('analytics', async (job: Job<AnalyticsJobData>) => {
        const data = job.data;

        try {
            const ua = parseUserAgent(data.userAgent);
            const ip = extractIP({}, data.rawHeaders ?? undefined);

            const geo = lookupGeo(ip || data.ipAddress);

            const referer = normalizeReferer(data.referer);

            await prisma.clicks.create({
                data: {
                    linkId: data.linkId,
                    ipAddress: ip || data.ipAddress,

                    userAgent: ua ? JSON.stringify(ua) : null,
                    referer: referer,
                    city: geo?.city,
                    deviceType: ua.device ? ua.device : undefined,
                    browser: ua?.browser,
                    os: ua?.os,
                    clickedAt: new Date(data.clickedAt),
                    isBot: ua?.isBot || false,
                }
            });


            if (!ua.isBot) {
                await prisma.links.update({
                    where: { id: data.linkId },
                    data: {
                        clickCount: { increment: 1 },
                    }
                });
            }

            cache.del(cacheKeys.analytics(data.linkId, '24h'));
            cache.del(cacheKeys.analytics(data.linkId, '7d'));
            cache.del(cacheKeys.analytics(data.linkId, '30d'));
            logger.debug(`Analytic Job ${job?.id} processed successfully:`, {
                linkId: data.linkId,
                shortCode: data.shortCode,
            });

        } catch (err) {
            logger.error(`Analytic Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, {
                linkId: data.linkId,
                shortCode: data.shortCode,
                // err: err.message
            })
            throw err;
        }
    },
        {
            connection: redisClient,
            concurrency: 20,
            limiter: {
                max: 100,
                duration: 1000,
            }
        }
    )

    worker.on('completed', (job) => {
        logger.debug(`Analytic Job ${job?.id} completed successfully:`, {
            linkId: job?.data?.linkId,
            shortCode: job?.data?.shortCode,
        });
    });

    worker.on('failed', (job, err) => {
        logger.error(`Analytic Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, {
            linkId: job?.data?.linkId,
        });
    });

    worker.on('error', (err) => {
        logger.error("Analytic worker error: ", err);
    })
    return worker;
}

export function closeAnalyticWorker() {
    if (worker) {
        worker.close().then(() => {
            logger.info("Analytic worker closed");
        }).catch((err) => {
            logger.error("Error closing Analytic worker: ", err);
        });
    }
}
function normalizeReferer(referer: string | null | undefined): string | null {
    if (!referer) return null;

    try {
        const url = new URL(referer);
        // Return just the hostname as the referer source
        return url.hostname || referer;
    } catch {
        // Not a valid URL - might be just a keyword like "direct"
        return referer.slice(0, 500); // Limit length
    }
}