import { PrismaClient, BillingPeriod, SubscriptionStatus, Subscriptions, PlanType, FeatureKey } from "../../../generated/prisma/client";
import { DbClient, prisma } from "../../config/prisma";
import { FeatureId, PlanId, PlanPriceId, SubscriptionId, UserId } from "../../types";
import { FeatureService } from "../links/features/feature.service";
import { SubscriptionRepository } from "./subscription.repository";
import { FeatureUsedService } from "../links/features/featureLimitUsed/featureUsed-limit.service"
import { FeatureState, SubscriptionWithFeatures, SubscriptionWithPlan } from "./types";
import { SubscriptionError } from "../../common/errors/AppError";
import { BatchPayload } from "../../../generated/prisma/internal/prismaNamespace";
import { PlanService } from "./plan/plan.service";
import { PlanPriceService } from "./plan-price/plan-price.service";
import { logger } from "../../common/utils/logger";

export class SubscriptionService {

    private _planService?: PlanService;
    private _planPriceService?: PlanPriceService;

    private subscriptionRepository = new SubscriptionRepository(prisma);
    private _featuresService?: FeatureService;
    private _featureLimitUsegeService?: FeatureUsedService;

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


    async buySubscription(
        userId: UserId,
        planType: PlanType,
        billingPeriod: BillingPeriod,
        tx?: DbClient
    ): Promise<void> {

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

        const subscription = await this.create(
            userId,
            plan.id as PlanId,
            planPrice.id as PlanPriceId,
            SubscriptionStatus.ACTIVE,
            new Date(),
            planPrice.billingPeriod
        );

        if (!subscription) {
            throw new SubscriptionError("Unable to create subscription");
        }
        logger.info(' subscription created successfully ');

    }


    /**
     * Create a new subscription
     */
    async create(
        userId: UserId,
        planId: PlanId,
        planPriceId: PlanPriceId,
        status: SubscriptionStatus,
        startedAt: Date,
        billingPeriod: BillingPeriod,
        tx?: DbClient
    ): Promise<Subscriptions> {

        const expiresAt = this.calculateExpiry(billingPeriod);


        const subscription = await this.subscriptionRepository.create({
            planPrice: { connect: { id: planPriceId } },
            user: { connect: { id: userId } },
            plan: { connect: { id: planId } },
            status,
            startedAt,
            expiresAt,
        }, tx)

        await this.initializeFeatureLimits(subscription.id as SubscriptionId, planId, tx);
        logger.info('initialized useage');
        return subscription;
    }




    /**
     * Get active subscription
     */
    async getActive(userId: UserId, tx?: DbClient): Promise<SubscriptionWithPlan> {
        const subscription = await this.subscriptionRepository.findActiveByUserId(userId, tx);
        if (!subscription) throw new SubscriptionError('No Plan Found');
        return subscription;
    }

    /**
     * Get all subscriptions of user
     */
    async getUserSubscriptions(userId: UserId, tx?: DbClient): Promise<Subscriptions[]> {
        const subscription = this.subscriptionRepository.findManyByUserId(userId, tx);
        if (!subscription) throw new SubscriptionError('No Plan Found');
        return subscription;
    }
    /**
     * get Subscription with features and featureLimitUsed
     */

    async getWithFeatureLimitFeatures(userId: UserId, tx?: DbClient): Promise<SubscriptionWithFeatures> {
        const subscription = await this.subscriptionRepository.findActiveWithFeatures(userId, tx);
        if (!subscription) throw new SubscriptionError('No subscrtipion found');

        const usageMap = new Map(
            subscription.featureUsage.map(f => [
                f.featureKey,
                f.currentUsed,
            ])
        );

        const features: FeatureState = {};
        for (const limit of subscription.plan.features) {
            features[limit.featureKey as FeatureKey] = {
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

    async changePlan(subscriptionId: SubscriptionId, newPlanId: PlanId, tx?: DbClient): Promise<Subscriptions> {
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
    async renew(subscriptionId: SubscriptionId, tx?: DbClient): Promise<Subscriptions> {
        const subscription = await this.subscriptionRepository.findById(subscriptionId, tx);

        if (!subscription) {
            throw new Error("Subscription not found");
        }

        return this.subscriptionRepository.renew(subscriptionId, subscription.expiresAt!);
    }

    /**
     * Cancel subscription
     */
    async cancel(subscriptionId: string, tx?: DbClient) {
        return this.subscriptionRepository.updateStatus(subscriptionId, SubscriptionStatus.CANCELLED, tx)
    }

    /**
     * Expire subscription
     */
    async expire(subscriptionId: SubscriptionId, tx?: DbClient): Promise<BatchPayload> {
        return this.subscriptionRepository.expireSubscriptions(subscriptionId, tx);
    }

    private async initializeFeatureLimits(
        subscriptionId: SubscriptionId,
        planId: PlanId,
        tx?: DbClient
    ): Promise<void> {
        const limits = await this.featuresService.getFeaturKey(planId, tx);

        if (!limits.length) return;

        await this.featureLimitUsed.createMany(subscriptionId, limits, tx);
    }

    /**
     * Calculate expiry date
     */
    private calculateExpiry(period: BillingPeriod): Date {
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