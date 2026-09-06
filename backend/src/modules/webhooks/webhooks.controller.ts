import { Router } from 'express';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
// import asyncHandler from '../../common/utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
// import { successResponse, sendCreated } from '../../utils/response';
import { successResponse } from '../../common/utils/response';
import { AuthenticatedRequest, AuthenticatedUser, UserId } from '../../types';
import {
  createWebhookSchema, updateWebhookSchema,
  webhookIdParamSchema, webhookDeliveriesQuerySchema,
} from './webhooks.schema';
import asyncHandler from '../../common/utils/asyncHandler';

const webhooksService = new WebhooksService();
// ─────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────

const webhooksController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    // const device = getDevice(req);
    const userId = (req as AuthenticatedRequest).user.sub;
    const result = await webhooksService.createWebhook(req.body, userId as UserId);
    successResponse(res, result.data, 'Webhook created. Store the secret securely — it will not be shown again.');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const webhooks = await webhooksService.listWebhooks(userId as UserId);
    successResponse(res, webhooks.data,
      'webbook list send successfully'
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const webhook = await webhooksService.getWebhookById(req.params.webhookId as string, userId as UserId);
    successResponse(res, webhook.data,
      'webhook sent successfully'
    );
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const webhook = await webhooksService.updateWebhook(req.params.webhookId as string, userId, req.body);
    successResponse(res, webhook.data, 'Webhook updated');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    await webhooksService.deleteWebhook(req.params.webhookId as string, userId as UserId);
    successResponse(res,
      null,
      'Webhook deleted');
  }),

  rotateSecret: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const result = await webhooksService.rotateSecret(req.params.webhookId as string, userId as UserId);
    successResponse(res, result,
      'Secret rotated. Update your integration immediately.');
  }),

  getDeliveries: asyncHandler(async (req: Request, res: Response) => {

    const userId = (req as AuthenticatedRequest).user.sub;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await webhooksService.getDeliveries(req.params.webhookId as string, userId as UserId, page, limit);
    successResponse(res, result.data,
      'Deliveries retrieved', 200, result.data.meta as never);
  }),

  retryDelivery: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const result = await webhooksService.retryDelivery(req.params.deliveryId as string, userId as UserId);
    successResponse(res, null,
      result.message);
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.sub;
    const stats = await webhooksService.getWebhookStats(userId as UserId);
    successResponse(res, stats.data,
      ''
    );
  }),

  // GET /api/webhooks/events — list all supported event types
  listEvents: asyncHandler(async (_req: Request, res: Response) => {
    const { ALL_WEBHOOK_EVENTS } = await import('../../types/enums');
    successResponse(res, {
      events: ALL_WEBHOOK_EVENTS.map((e) => ({
        type: e,
        description: EVENT_DESCRIPTIONS[e] ?? e,
      }),
      ),
    }, "");
  }),
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  'link.created': 'Triggered when a new short link is created',
  'link.updated': 'Triggered when a link destination or metadata is changed',
  'link.deleted': 'Triggered when a short link is permanently deleted',
  'link.clicked': 'Triggered on every redirect (excluding bots)',
  'link.expired': 'Triggered when a link passes its expiration date',
  'team.member_joined': 'Triggered when a user accepts a team invitation',
  'team.member_removed': 'Triggered when a member is removed from a team',
};


export { webhooksController }