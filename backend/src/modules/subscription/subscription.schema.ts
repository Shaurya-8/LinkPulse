import { z } from 'zod';
import { PlanType, BillingPeriod } from '../../../generated/prisma/client';

export const subscriptionSchema = z.object({
    params: z.object({
        userId: z.string().uuid(),
    }),
    body: z.object({
        planType: z.enum(PlanType),
        billingPeriod: z.enum(BillingPeriod),
    }),
});

export const changePlanSchema = z.object({
    params: z.object({
        subscriptionId: z.string().uuid(),
        userId: z.string().uuid(),
    }),
    body: z.object({
        planType: z.enum(PlanType),
        billingPeriod: z.enum(BillingPeriod).optional(),
    })
});

export const renewSubscriptionSchema = z.object({
    params: z.object({
        subscriptionId: z.string().uuid(),
        userId: z.string().uuid(),
    }),
});
export const cancelSubscriptionSchema = z.object({
    params: z.object({
        subscriptionId: z.string().uuid(),
        userId: z.string().uuid(),
    }),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>['body'];
export type ChangePlanInput = z.infer<typeof changePlanSchema>['body'];
export type RenewSubscriptionInput = z.infer<typeof renewSubscriptionSchema>['params'];
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>['params'];
