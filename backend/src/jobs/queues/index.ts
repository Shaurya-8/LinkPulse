import { Queue } from "bullmq";
import { redisClient } from "../../config/redis";


import { AnalyticsJobData, BulkLinkJobData, EmailJobData } from "../../types"
import { jobType } from "../enums";
import { WebhookDeliveries } from "../../../generated/prisma/client";
import { WebhookDeliveryJobData } from "../worker/webhook.worker";

const defaultJobOptions = {
    removeOnComplete: { count: 100, age: 24 * 60 * 60 },
    removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
};


const emailQueue = new Queue<EmailJobData>(jobType.EMAIL, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, priority: 1 }
});

const analyticsQueue = new Queue<AnalyticsJobData>(jobType.ANALYTICS, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, attempts: 5, removeOnComplete: { count: 50 } }
});

const bulkLinkQueue = new Queue<BulkLinkJobData>(jobType.BULKLINK, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, attempts: 2, },

});

const linkExpiryQueue = new Queue(jobType.LINK_EXPIRY, {
    connection: redisClient,
    defaultJobOptions,

});

export const webhookQueue = new Queue<WebhookDeliveryJobData>(jobType.WEBHOOK, {
    connection: redisClient,
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 4,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000, age: 30 * 24 * 60 * 60 }
    },

})

export async function enqueueEmail(data: EmailJobData): Promise<void> {
    await emailQueue.add('send-email', data, { priority: 1 });
}

export async function enqueueAnalytics(data: AnalyticsJobData) {
    await analyticsQueue.add('process-analytic', data, { delay: 500, priority: 10 });
}

export async function enqueueBulkLink(data: BulkLinkJobData) {
    await bulkLinkQueue.add(`bulk-${data.jobId}`, data);
}

export async function enqueueLinkEpiryQueue(): Promise<void> {
    await linkExpiryQueue.add('check-expired', {}, { jobId: 'check-expre', removeOnComplete: true });
}

export async function enqueueWebhookDelivery(data: WebhookDeliveryJobData): Promise<void> {
    await webhookQueue.add(`delivery-${data.deliveryId}`, data, { jobId: data.deliveryId });

}

export async function getQueueHealth(): Promise<Record<string, object>> {
    const queues = [analyticsQueue, emailQueue, bulkLinkQueue, linkExpiryQueue];
    const health: Record<string, object> = {};
    for (const queue of queues) {
        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(), queue.getActiveCount(),
            queue.getCompletedCount(), queue.getFailedCount(),
        ]);
        health[queue.name] = { waiting, active, completed, failed };
    }
    return health;
}
