import { z } from 'zod';
import { ALL_WEBHOOK_EVENTS } from '../../types/enums';

export const createWebhookSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    url: z
      .string()
      .url('Must be a valid HTTPS URL')
      .refine((u) => u.startsWith('https://'), 'Webhook URL must use HTTPS'),
    events: z
      .array(z.enum(ALL_WEBHOOK_EVENTS as [string, ...string[]]))
      .min(1, 'Select at least one event'),
    description: z.string().max(500).optional(),
  }),
});

export const updateWebhookSchema = z.object({
  params: z.object({ webhookId: z.string().cuid() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    url: z.string().url().refine((u) => u.startsWith('https://')).optional(),
    events: z.array(z.enum(ALL_WEBHOOK_EVENTS as [string, ...string[]])).min(1).optional(),
    description: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const webhookIdParamSchema = z.object({
  params: z.object({ webhookId: z.string().cuid() }),
});

export const webhookDeliveriesQuerySchema = z.object({
  params: z.object({ webhookId: z.string().cuid() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>['body'];
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>['body'];