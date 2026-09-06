import { Worker, Job } from "bullmq";
import { redisClient } from "../../config/redis";

import { config } from "../../config";
import { logger } from "../../common/utils/logger";

import { UserId } from "../../types";


import { getTransporter } from "../../config/nodemailer";

import { BulkLinkJobData, EmailJobData } from "../../types";
import { jobType } from "../enums";
import { BadRequestError } from "../../common/errors/AppError";
import { prisma } from "../../config/prisma";
import {validateUrl} from "../../modules/links/utils/validate-url";
import {normalizeUrl} from "../../modules/links/utils/normalize-url";
import {generateShortCode} from "../../modules/links/utils/generateShortCode";
import { LinkRepository } from "../../modules/links/links.repository";

const linkRepository = new LinkRepository(prisma);

let worker: Worker | null = null;
export function createBulkWordker(): Worker {
    worker = new Worker<BulkLinkJobData>(
        jobType.BULKLINK,
        async (job: Job<BulkLinkJobData>) => {
            const { jobId, userId, links } = job.data;

            await prisma.bulkJob.update({
                where: { id: jobId },
                data: { status: 'PROCESSIG', totalLinks: links.length }
            });

            const results: Array<{
                originalUrl: string;
                shortUrl?: string;
                shortCode?: string;
                error?: string;
                status: 'success' | 'failed';
            }> = [];

            let processed = 0;
            let failed = 0;

            for (let i = 0; i < links.length; i++) {
                const linkData = links[i];
                if(!linkData){
                    return;
                }

                try {
                    const normalizedUrl = normalizeUrl(linkData.originalUrl);
                    const validation = await validateUrl(normalizedUrl);

                    if (!validation) {
                        results.push({
                            originalUrl: linkData.originalUrl,
                            error: "",
                            status: 'failed',
                        });
                        failed++;
                        continue;
                    }

                    const shortCode =  generateShortCode();

                    const link = await linkRepository.createLink(
                        {dto: { longUrl:linkData.originalUrl ,redirectType: "TEMPORARY" },
                        shortCode,
                        normalizedUrl},
                        userId as UserId,
                    )
                    results.push({
                        originalUrl: linkData.originalUrl,
                        shortUrl: `${process.env.SHORT_DOMAIN}/${shortCode}`,
                        shortCode: link.shortCode,
                        status: 'success',
                    });
                    processed++;
                } catch (error) {
                    const errMsg = error instanceof Error ? error.message : 'Unknown error';
                    results.push({
                        originalUrl: linkData.originalUrl,
                        error: errMsg,
                        status: 'failed',
                    });
                    failed++;
                }

                // Update progress every 10 items
                if ((i + 1) % 10 === 0 || i === links.length - 1) {
                    await prisma.bulkJob.update({
                        where: { id: jobId },
                        data: { processed, failed },
                    });
                    // Report progress to BullMQ
                    await job.updateProgress(Math.round(((i + 1) / links.length) * 100));
                }
            }
            // Mark as complete
            await prisma.bulkJob.update({
                where: { id: jobId },
                data: {
                    status: failed === links.length ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'COMPLETED',
                    processed,
                    failed,
                    resultData: JSON.stringify(results),
                },
            });

            logger.info(`Bulk job ${jobId} completed: ${processed} success, ${failed} failed`);
        },
        {
            connection: redisClient,
            concurrency: 2, // Limit concurrency for bulk jobs
        },
    );

    worker.on('failed', async (job, err) => {
        logger.error(`Bulk job ${job?.id} failed:`, err);
        if (job?.data?.jobId) {
            await prisma.bulkJob.update({
                where: { id: job.data.jobId },
                data: { status: 'FAILED', errorLog: err.message },
            }).catch(() => { });
        }

    }

    )
    return worker;
}
