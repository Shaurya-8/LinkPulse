import { Queue, Worker } from "bullmq";
import { cache, cacheKeys, redisClient } from "../../config/redis";
import { prisma } from "../../config/prisma";
import { UserId } from "../../types";
import { logger } from "../../common/utils/logger";

const EXPIRY_QUEUE_NAME = "link-expiry-scheduler";

let expiryWorker: Worker | null = null;

export function createLinkExpiryScheduler(): { queue: Queue, worker: Worker } {
    const queue = new Queue(EXPIRY_QUEUE_NAME, {
        connection: redisClient,
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail:
                { count: 10 },
        },
    });

    queue.add(
        'expire-links',
        {},
        {
            repeat: {
                every: 5 * 60 * 1000, // Run every hour
                jobId: 'link-expiry-recurring',
            }
        },
    );
    const worker = new Worker(
        EXPIRY_QUEUE_NAME,
        async (job) => {
            const now = new Date();
            // Fetch all links that have expired
            const expiredLinks = await prisma.links.findMany({
                where: {
                    expiryDate: {
                        lte: now,
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                    shortCode: true,
                    userId: true,
                },
                take: 100
            });
            if (expiredLinks.length === 0) {
                return;
            }

            await prisma.links.updateMany({
                where: {
                    id: {
                        in: expiredLinks.map(link => link.id),
                    },
                },
                data: {
                    isActive: false,
                },
            });

            for (const link of expiredLinks as Array<{ id: string, shortCode: string, userId: string }>) {
                await cache.del(cacheKeys.shortLink(link.shortCode));
                await cache.del(cacheKeys.linkById(link.userId as UserId, link.id));
            }

            logger.info(`Expired ${expiredLinks.length} links at ${now.toISOString()}`);
        },
        {
            connection: redisClient,
            concurrency: 1,
        }
    );
    worker.on('error', (err) => {
        logger.error(`Link Expiry Job failed:`, {
            err: err.message
        });
    });

    expiryWorker = worker;
    return { queue, worker };
}

export function closeLinkExpiryScheduler() {
    if (expiryWorker) {
        expiryWorker.close().then(() => {
            logger.info("Link Expiry worker closed");
        }).catch((err) => {
            logger.error("Error closing Link Expiry worker:", err);
        });
    } 
}