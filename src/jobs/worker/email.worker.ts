import { Worker, Job } from "bullmq";
import { redisClient } from "../../config/redis";

import { config } from "../../config";
import { logger } from "../../common/utils/logger";

import { getTransporter } from "../../config/nodemailer";

import { EmailJobData } from "../../types";
import { jobType } from "../enums";
import { BadRequestError } from "../../common/errors/AppError";
import { } from "../../common/errors/AppError"

const transporter = getTransporter();
let worker: Worker | null = null;
export function createEmailWorker(): Worker {
    if (worker) {
        logger.warn("Email worker already exists, returning existing worker");
        return worker;
    }
    worker = new Worker(jobType.EMAIL,
        async (job: Job<EmailJobData>) => {
            try {
                const { to, subject, html, from } = job.data;
                await transporter.sendMail({
                    from: from ?? `"${config.app.name}" <${config.Email.user}>`,
                    to,
                    subject,
                    html,
                });

                logger.info(`email send ${to}: ${subject} `)
            } catch (err) {
                logger.error('email not send', err);
                throw new BadRequestError('Email not send');
            }
        }, {
        connection: redisClient,
        concurrency: 5
    }
    );

    worker.on("failed", (job, err) => {
        logger.error(`Email Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, {
            to: job?.data?.to,
            subject: job?.data.subject,
            err: err.message
        })
    });

    worker.on('error', (err) => {
        logger.error("email worker error: ", err);
    })
    return worker;
}

export function closeEmailWorker() {
    if (worker) {
        worker.close().then(() => {
            logger.info("Email worker closed");
        }).catch((err) => {
            logger.error("Error closing email worker: ", err);
        });
    }
}
