import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { redisClient } from '../../config/redis';
import { prisma } from '../../config/prisma';
import { logger } from '../../common/utils/logger';
import { signPayload } from '../../modules/webhooks/webhooks.service';

export interface WebhookDeliveryJobData {
  webhookId: string;
  eventType: string;
  payload: string;    // pre-serialised JSON body
  deliveryId: string;
}

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BODY_LENGTH = 1000;
let worker: Worker | null = null;

export function createWebhookWorker(): Worker {
  worker = new Worker<WebhookDeliveryJobData>(
    'webhooks',
    async (job: Job<WebhookDeliveryJobData>) => {
      const { webhookId, eventType, payload, deliveryId } = job.data;
      const start = Date.now();

      // Fetch live webhook config (could have been updated since job was queued)
      const webhook = await prisma.webhooks.findUnique({
        where: { id: webhookId },
        select: { id: true, url: true, secret: true, isActive: true },
      });

      if (!webhook || !webhook.isActive) {
        logger.info(`Webhook ${webhookId} is inactive or deleted, skipping delivery ${deliveryId}`);
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signPayload(webhook.secret, payload, timestamp);

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let success = false;
      let errorMessage: string | null = null;

      try {
        const response = await axios.post(webhook.url, payload, {
          timeout: DELIVERY_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'X-LinkSnap-Event': eventType,
            'X-LinkSnap-Delivery': deliveryId,
            'X-LinkSnap-Timestamp': timestamp.toString(),
            'X-LinkSnap-Signature': signature,
            'User-Agent': 'LinkSnap-Webhooks/1.0',
          },
          // Accept any status so we can record it
          validateStatus: () => true,
          maxRedirects: 3,
        });

        statusCode = response.status;
        responseBody = String(response.data ?? '').slice(0, MAX_RESPONSE_BODY_LENGTH);
        // 2xx = success
        success = statusCode >= 200 && statusCode < 300;
      } catch (err) {
        const e = err as Error & { code?: string };
        errorMessage = e.code === 'ECONNABORTED'
          ? `Timeout after ${DELIVERY_TIMEOUT_MS}ms`
          : e.message.slice(0, 500);
        success = false;
      }

      const duration_ms = Date.now() - start;

      // Upsert delivery record
      await prisma.webhookDeliveries.upsert({
        where: { id: deliveryId },
        create: {
          id: deliveryId,
          webhookId,
          eventType,
          payload,
          statusCode,
          responseBody,
          attempt: job.attemptsMade + 1,
          success,
          error: errorMessage,
          duration_ms,
          deliveredAt: new Date(),
        },
        update: {
          statusCode,
          responseBody,
          attempt: job.attemptsMade + 1,
          success,
          error: errorMessage,
          duration_ms,
          deliveredAt: new Date(),
        },
      });

      // Update webhook aggregate stats
      await prisma.webhooks.update({
        where: { id: webhookId },
        data: {
          totalDeliveries: { increment: 1 },
          ...(success
            ? { successfulDeliveries: { increment: 1 } }
            : { failedDeliveries: { increment: 1 } }),
          lastTriggeredAt: new Date(),
        },
      });

      if (!success) {
        // Throw so BullMQ retries
        throw new Error(
          errorMessage ?? `HTTP ${statusCode} from ${webhook.url}`,
        );
      }

      logger.debug(`Webhook ${webhookId} delivered ${eventType} → HTTP ${statusCode} (${duration_ms}ms)`);
    },
    {
      connection: redisClient,
      concurrency: 10,
    },
  );

  worker.on('failed', (job, err) => {
    logger.warn(
      `Webhook delivery ${job?.data?.deliveryId} attempt ${job?.attemptsMade ?? 0} failed: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    logger.error('Webhook worker error:', err);
  });

  return worker;
}

export function closeWebhookWorker() {
  if (worker) {
    worker.close().then(() => {
      logger.info("Webhook worker closed");
    }).catch((err) => {
      logger.error("Error closing webhook worker: ", err);
    });
  }
}