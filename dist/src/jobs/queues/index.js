import { Queue } from "bullmq";
import { redisClient } from "../../config/redis";
import { jobType } from "../enums";
const defaultJobOptions = {
    removeOnComplete: { count: 100, age: 24 * 60 * 60 },
    removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
};
const emailQueue = new Queue(jobType.EMAIL, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, priority: 1 }
});
const analyticsQueue = new Queue(jobType.ANALYTICS, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, attempts: 5, removeOnComplete: { count: 50 } }
});
const bulkLinkQueue = new Queue(jobType.BULKLINK, {
    connection: redisClient,
    defaultJobOptions: { ...defaultJobOptions, attempts: 2, },
});
const linkExpiryQueue = new Queue(jobType.LINK_EXPIRY, {
    connection: redisClient,
    defaultJobOptions,
});
export async function enqueueEmail(data) {
    await emailQueue.add('send-email', data, { priority: 1 });
}
export async function enqueueAnalytics(data) {
    await analyticsQueue.add('process-analytic', data, { delay: 500, priority: 10 });
}
export async function enqueueBulkLink(data) {
    await bulkLinkQueue.add(`bulk-${data.jobId}`, data);
}
export async function enqueueLinkEpiryQueue() {
    await linkExpiryQueue.add('check-expired', {}, { jobId: 'check-expre', removeOnComplete: true });
}
export async function getQueueHealth() {
    const queues = [analyticsQueue, emailQueue, bulkLinkQueue, linkExpiryQueue];
    const health = {};
    for (const queue of queues) {
        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(), queue.getActiveCount(),
            queue.getCompletedCount(), queue.getFailedCount(),
        ]);
        health[queue.name] = { waiting, active, completed, failed };
    }
    return health;
}
//# sourceMappingURL=index.js.map