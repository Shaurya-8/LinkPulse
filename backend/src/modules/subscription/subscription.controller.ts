import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import asyncHandler from '../../common/utils/asyncHandler';
import { AuthenticatedRequest, SubscriptionId } from '../../types';
import { successResponse } from '../../common/utils/response';

const subscriptionService = new SubscriptionService();

export const subscriptionController = {

    buySubscription: asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthenticatedRequest).user.sub;
        const result = await subscriptionService.buySubscription(
            userId,
            req.body.planType,
            req.body.billingPeriod
        );
        successResponse(res, null, 'Subscription purchased successfully', 200);
       
    }),

    getActiveSubscription: asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthenticatedRequest).user.sub;
        const subscription = await subscriptionService.getActive(userId);
        successResponse(res, subscription, 'Active subscription retrieved successfully', 200);
    }),

    getUserSubscriptions: asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as AuthenticatedRequest).user.sub;
        const subscriptions = await subscriptionService.getUserSubscriptions(userId);
        successResponse(res, subscriptions, 'User subscriptions retrieved successfully', 200);
    }),

    changePlan: asyncHandler(async (req: Request, res: Response) => {
        const subscriptionId = req.params.subscriptionId as SubscriptionId;
        const newPlanId = req.body.newPlanId;
        const updatedSubscription = await subscriptionService.changePlan(subscriptionId, newPlanId);
        successResponse(res, updatedSubscription, 'Subscription plan changed successfully', 200);
    }),

    renewSubscription: asyncHandler(async (req: Request, res: Response) => {
        const subscriptionId = req.params.subscriptionId as SubscriptionId;
        const renewedSubscription = await subscriptionService.renew(subscriptionId);
        successResponse(res, renewedSubscription, 'Subscription renewed successfully', 200);
    }),

    cancelSubscription: asyncHandler(async (req: Request, res: Response) => {
        const subscriptionId = req.params.subscriptionId as SubscriptionId;
        await subscriptionService.cancel(subscriptionId);
        successResponse(res, null, 'Subscription canceled successfully', 200);
    }),


}