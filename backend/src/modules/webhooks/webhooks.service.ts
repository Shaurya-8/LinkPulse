import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { logger } from '../../common/utils/logger';
import { BadRequestError, LimitExceededError, NotFoundError } from '../../common/errors/AppError';
// import { buildPaginationMeta } from '../../utils/response';
import { WebhookEventType } from '../../types/enums';
import type { CreateWebhookInput, UpdateWebhookInput } from './webhooks.schema';

const WEBHOOK_SECRET_PREFIX = 'whs_';
const MAX_WEBHOOKS_PER_USER = 20;

// ─────────────────────────────────────────────
// Signing
// ─────────────────────────────────────────────

export function generateWebhookSecret(): string {
  return `${WEBHOOK_SECRET_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
}

export function signPayload(secret: string, payload: string, timestamp: number): string {
  const msg = `${timestamp}.${payload}`;
  return `sha256=${crypto.createHmac('sha256', secret).update(msg).digest('hex')}`;
}

export function buildWebhookPayload(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  deliveryId: string,
): { body: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = {
    id: `evt_${crypto.randomBytes(8).toString('hex')}`,
    event: eventType,
    timestamp: new Date().toISOString(),
    apiVersion: '2024-01-01',
    deliveryId,
    data,
  };
  return { body: JSON.stringify(payload), timestamp };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export class WebhooksService {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createWebhook(input: CreateWebhookInput, userId: string): Promise<{ data: { webhook: object; secret: string } }> {
    const count = await prisma.webhooks.count({ where: { userId } });
    if (count >= MAX_WEBHOOKS_PER_USER) {
      throw new LimitExceededError(`Maximum ${MAX_WEBHOOKS_PER_USER} webhooks per user`);
    }

    const secret = generateWebhookSecret();

    const webhook = await prisma.webhooks.create({
      data: {
        userId,
        name: input.name,
        url: input.url,
        secret,
        events: input.events,
        description: input.description,
      },
    });

    // Return secret only once at creation
    return {
      data: {
        webhook: this.safeWebhook(webhook),
        secret,
      }
    };
  }

  async listWebhooks(userId: string): Promise<{ data: object[] }> {
    const webhooks = await prisma.webhooks.findMany({
      where: { userId },
      select: {
        id: true, name: true, url: true, events: true, isActive: true,
        description: true, totalDeliveries: true, successfulDeliveries: true,
        failedDeliveries: true, lastTriggeredAt: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: webhooks };
  }

  async getWebhookById(webhookId: string, userId: string): Promise<{ data: object }> {
    const webhook = await prisma.webhooks.findFirst({
      where: { id: webhookId, userId },
      select: {
        id: true, name: true, url: true, events: true, isActive: true,
        description: true, totalDeliveries: true, successfulDeliveries: true,
        failedDeliveries: true, lastTriggeredAt: true, createdAt: true, updatedAt: true,
      },
    });
    if (!webhook) throw new NotFoundError('Webhook not found');
    return { data: webhook };
  }

  async updateWebhook(webhookId: string, userId: string, input: UpdateWebhookInput): Promise<{ data: object }> {
    const existing = await prisma.webhooks.findFirst({ where: { id: webhookId, userId } });
    if (!existing) throw new NotFoundError('Webhook not found');

    const webhook = await prisma.webhooks.update({
      where: { id: webhookId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.events !== undefined && { events: input.events }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return { data: this.safeWebhook(webhook) };
  }

  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const existing = await prisma.webhooks.findFirst({ where: { id: webhookId, userId } });
    if (!existing) throw new NotFoundError('Webhook not found');
    await prisma.webhooks.delete({ where: { id: webhookId } });
  }

  // ── Secret rotation ────────────────────────────────────────────────────────

  async rotateSecret(webhookId: string, userId: string): Promise<{ secret: string }> {
    const existing = await prisma.webhooks.findFirst({ where: { id: webhookId, userId } });
    if (!existing) throw new NotFoundError('Webhook not found');

    const newSecret = generateWebhookSecret();
    await prisma.webhooks.update({ where: { id: webhookId }, data: { secret: newSecret } });
    return { secret: newSecret };
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────

  async getDeliveries(
    webhookId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: { deliveries: object[]; meta: object } }> {
    // Verify ownership
    const webhook = await prisma.webhooks.findFirst({ where: { id: webhookId, userId }, select: { id: true } });
    if (!webhook) throw new NotFoundError('Webhook not found');

    const skip = (page - 1) * limit;
    const [total, deliveries] = await Promise.all([
      prisma.webhookDeliveries.count({ where: { webhookId } }),
      prisma.webhookDeliveries.findMany({
        where: { webhookId },
        select: {
          id: true, eventType: true, statusCode: true, success: true,
          attempt: true, error: true, duration: true, deliveredAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: { deliveries, meta: buildPaginationMeta(total, page, limit) } };
  }

  async retryDelivery(deliveryId: string, userId: string): Promise<{ message: string }> {
    const delivery = await prisma.webhookDeliveries.findUnique({
      where: { id: deliveryId },
      include: { webhook: { select: { userId: true } } },
    });
    if (!delivery || delivery.webhook.userId !== userId) {
      throw new NotFoundError('Delivery not found');
    }
    if (delivery.success) {
      throw new BadRequestError('This delivery was already successful');
    }

    // Re-enqueue
    const { enqueueWebhookDelivery } = await import('../../jobs/queues');
    await enqueueWebhookDelivery({
      webhookId: delivery.webhookId,
      eventType: delivery.eventType as WebhookEventType,
      payload: delivery.payload,
      deliveryId: delivery.id,
    });

    return { message: 'Delivery re-queued' };
  }

  // ── Trigger (called from other services) ──────────────────────────────────

  async triggerEvent(
    eventType: WebhookEventType,
    userId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const webhook = await prisma.webhooks.findMany({
        where: { userId, isActive: true },
        select: { id: true, events: true },
      });

      const matching = (webhook as Array<{ id: string; events: string[] }>).filter((w) => w.events.includes(eventType));
      if (matching.length === 0) return;

      const { enqueueWebhookDelivery } = await import('../../jobs/queues');

      for (const webhook of matching) {
        const deliveryId = crypto.randomUUID();
        const { body } = buildWebhookPayload(eventType, data, deliveryId);

        await enqueueWebhookDelivery({
          webhookId: webhook.id,
          eventType,
          payload: body,
          deliveryId,
        });
      }
    } catch (err) {
      // Non-critical — never throw from webhook triggers
      logger.error('Failed to trigger webhooks:', err);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getWebhookStats(userId: string): Promise<{ data: object }> {
    const [totalWebhooks, activeWebhooks, recent] = await Promise.all([
      prisma.webhooks.count({ where: { userId } }),
      prisma.webhooks.count({ where: { userId, isActive: true } }),
      prisma.webhookDeliveries.findMany({
        where: { webhook: { userId } },
        select: { success: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const successCount = recent.filter((d) => d.success).length;
    const failureCount = recent.length - successCount;
    const successRate = recent.length > 0 ? Math.round((successCount / recent.length) * 100) : 100;

    return { data: { totalWebhooks, activeWebhooks, successRate, successCount, failureCount, recentTotal: recent.length } };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private safeWebhook(webhook: Record<string, unknown>): object {
    const { secret: _secret, ...safe } = webhook;
    return safe;
  }
}
