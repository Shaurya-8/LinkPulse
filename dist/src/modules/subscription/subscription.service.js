import { BillingPeriod, SubscriptionStatus } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { FeatureService } from "../links/features/feature.service";
import { SubscriptionRepository } from "./subscription.repository";
import { FeatureUsedService } from "../links/features/featureLimitUsed/featureUsed-limit.service";
import { SubscriptionError } from "../../common/errors/AppError";
import { PlanService } from "./plan/plan.service";
import { PlanPriceService } from "./plan-price/plan-price.service";
import { logger } from "../../common/utils/logger";
export class SubscriptionService {
    _planService;
    _planPriceService;
    subscriptionRepository = new SubscriptionRepository(prisma);
    _featuresService;
    _featureLimitUsegeService;
    get planService() {
        return this._planService ??= new PlanService();
    }
    get planPriceService() {
        return this._planPriceService ??= new PlanPriceService();
    }
    get featuresService() {
        return this._featuresService ??= new FeatureService();
    }
    get featureLimitUsed() {
        return this._featureLimitUsegeService ??= new FeatureUsedService();
    }
    /**
     * buySubscription
     */
    async buySubscription(userId, planType, billingPeriod, tx) {
        const existSubscription = await this.subscriptionRepository.findActiveByUserId(userId, tx);
        if (existSubscription && existSubscription.plan.name === planType) {
            throw new SubscriptionError("This current active plan");
        }
        const plan = await this.planService.getPlanByName(planType, tx);
        if (!plan) {
            throw new SubscriptionError("unable to find Plan");
        }
        logger.info(' plan found ');
        const planPrice = await this.planPriceService.getPrice(plan.id, billingPeriod, tx);
        if (!planPrice) {
            throw new SubscriptionError("unable to find Plan Price");
        }
        logger.info(' price found ');
        // Todo: add payment mothods 
        const subscription = await this.create(userId, plan.id, planPrice.id, SubscriptionStatus.ACTIVE, new Date(), planPrice.billingPeriod);
        if (!subscription) {
            throw new SubscriptionError("Unable to create subscription");
        }
        logger.info(' subscription created successfully ');
    }
    /**
     * Create a new subscription
     */
    async create(userId, planId, planPriceId, status, startedAt, billingPeriod, tx) {
        const expiresAt = this.calculateExpiry(billingPeriod);
        const subscription = await this.subscriptionRepository.create({
            planPrice: { connect: { id: planPriceId } },
            user: { connect: { id: userId } },
            plan: { connect: { id: planId } },
            status,
            startedAt,
            expiresAt,
        }, tx);
        await this.initializeFeatureLimits(subscription.id, planId, tx);
        logger.info('initialized useage');
        return subscription;
    }
    /**
     * Get active subscription
     */
    async getActive(userId, tx) {
        const subscription = await this.subscriptionRepository.findActiveByUserId(userId, tx);
        if (!subscription)
            throw new SubscriptionError('No Plan Found');
        return subscription;
    }
    /**
     * Get all subscriptions of user
     */
    async getUserSubscriptions(userId, tx) {
        const subscription = this.subscriptionRepository.findManyByUserId(userId, tx);
        if (!subscription)
            throw new SubscriptionError('No Plan Found');
        return subscription;
    }
    /**
     * get Subscription with features and featureLimitUsed
     */
    async getWithFeatureLimitFeatures(userId, tx) {
        const subscription = await this.subscriptionRepository.findActiveWithFeatures(userId, tx);
        if (!subscription)
            throw new SubscriptionError('No subscrtipion found');
        const usageMap = new Map(subscription.featureUsage.map(f => [
            f.featureKey,
            f.currentUsed,
        ]));
        const features = {};
        for (const limit of subscription.plan.features) {
            features[limit.featureKey] = {
                limit: limit.limitValue,
                used: usageMap.get(limit.featureKey) ?? 0,
            };
        }
        const subscriptionWithFeature = {
            ...subscription,
            features,
        };
        return subscriptionWithFeature;
    }
    /**
     * Upgrade/Downgrade Plan
     */
    async changePlan(subscriptionId, newPlanId, tx) {
        const subscription = await this.subscriptionRepository.updatePlan(subscriptionId, newPlanId, tx);
        await prisma.featureUsages.deleteMany({
            where: {
                subscriptionId,
            },
        });
        await this.initializeFeatureLimits(subscriptionId, newPlanId);
        return subscription;
    }
    /**
     * Renew subscription
     */
    async renew(subscriptionId, tx) {
        const subscription = await this.subscriptionRepository.findById(subscriptionId, tx);
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        return this.subscriptionRepository.renew(subscriptionId, subscription.expiresAt);
    }
    /**
     * Cancel subscription
     */
    async cancel(subscriptionId, tx) {
        return this.subscriptionRepository.updateStatus(subscriptionId, SubscriptionStatus.CANCELLED, tx);
    }
    /**
     * Expire subscription
     */
    async expire(subscriptionId, tx) {
        return this.subscriptionRepository.expireSubscriptions(subscriptionId, tx);
    }
    async initializeFeatureLimits(subscriptionId, planId, tx) {
        const limits = await this.featuresService.getFeaturKey(planId, tx);
        if (!limits.length)
            return;
        await this.featureLimitUsed.createMany(subscriptionId, limits, tx);
    }
    /**
     * Calculate expiry date
     */
    calculateExpiry(period) {
        const date = new Date();
        switch (period) {
            case BillingPeriod.MONTHLY:
                date.setMonth(date.getMonth() + 1);
                break;
            case BillingPeriod.YEARLY:
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        return date;
    }
}
//# sourceMappingURL=subscription.service.js.map