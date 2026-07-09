import { Queue } from "bullmq";
import { redisClient } from "../../config/redis";


import { EmailJobData } from "../../types"
import { jobType } from "../enums";

const defaultJobOptions = {
    removeOnComplete: { count: 100, age: 24 * 60 * 60 },
    removeOnFail: { count: 200, age: 7 * 24 * 60 * 60 },
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
};


const emailQueue = new Queue<EmailJobData>(jobType.EMAIL, {
    connection: redisClient,
    defaultJobOptions
});

export async function enqueueEmail(data: EmailJobData): Promise<void> {
    await emailQueue.add('send-email', data, { priority: 1 });
}