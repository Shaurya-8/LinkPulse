"use strict";
// import { DbClient, prisma } from "../../../../config/prisma";
// import { FeatureLimitRepository } from "./feature-limit.repository";
// import { IFeatureLimitService } from "./IFeature-limit.service";
// import { PlanId } from "../../../../types";
// import { SubscriptionError } from "../../../../common/errors/AppError";
// import { FeatureKey } from "../../../../../generated/prisma/enums";
// import { FeatureLimits } from "../../../../../generated/prisma/client";
// export class FeatureLimitService implements IFeatureLimitService {
//     private cachedFeatureLimit: FeatureLimits[] | null = null;
//     private featurelimitRepository = new FeatureLimitRepository(prisma);
//     async get(planId: PlanId, tx?: DbClient): Promise<FeatureLimits[]> {
//         if (this.cachedFeatureLimit) {
//             return this.cachedFeatureLimit;
//         }
//         const featureLimit = await this.featurelimitRepository.findByPlan(planId, tx);
//         if (!featureLimit) throw new SubscriptionError("plan not found");
//         this.cachedFeatureLimit = featureLimit;
//         return featureLimit;
//     }
//     async getFeaturKey(planId: PlanId, tx?: DbClient) {
//         const feature = await this.featurelimitRepository.findFeatureKey(planId, tx);
//         if (!feature) throw new SubscriptionError("plan not found");
//         return feature;
//     }
//     async create(planId: PlanId, featureKey: FeatureKey, limitValue: number, tx?: DbClient) {
//         return this.featurelimitRepository.create({ planId, featureKey, limitValue }, tx);
//     }
//     async createMany(planId: PlanId, features: { featureKey: FeatureKey, limitValue: number }[], tx?: DbClient) {
//         return this.featurelimitRepository.createMany(
//             features.map(feature => ({
//                 planId,
//                 featureKey: feature.featureKey,
//                 limitValue: feature.limitValue
//             }), tx)
//         );
//     }
//     async initializeSubscriptionUsage(
//         subscriptionId: string,
//         planId: string
//     ): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     async consume(
//         subscriptionId: string,
//         featureKey: string,
//         amount: number = 1
//     ): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     async hasQuota(
//         subscriptionId: string,
//         featureKey: string,
//         amount: number = 1
//     ): Promise<boolean> {
//         throw new Error("Method not implemented.");
//     }
//     async getRemaining(
//         subscriptionId: string,
//         featureKey: string
//     ): Promise<number> {
//         throw new Error("Method not implemented.");
//     }
//     async resetUsage(
//         subscriptionId: string
//     ): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     async syncPlanLimits(
//         subscriptionId: string,
//         planId: string
//     ): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     async restore(
//         subscriptionId: string,
//         featureKey: string,
//         amount: number = 1
//     ): Promise<void> {
//         throw new Error("Method not implemented.");
//     }
//     /**
//      * Check feature limit
//      */
//     async checkFeatureLimit(
//         subscriptionId: string,
//         featureKey: FeatureKey,
//     ) {
//         const feature = await prisma.featureLimits.findFirst({
//             where: {
//                 featureKey,
//             },
//         });
//         if (!feature) {
//             throw new Error("Feature not found");
//         }
//         const usage = await prisma.featureLimitUsages.findUnique({
//             where: {
//                 subscriptionId_featureKey: {
//                     subscriptionId,
//                     featureKey: feature.featureKey,
//                 },
//             },
//         });
//         const subscription = await prisma.subscriptions.findUnique({
//             where: {
//                 id: subscriptionId,
//             },
//             include: {
//                 plan: {
//                     include: {
//                         featureLimits: true
//                     },
//                 },
//             },
//         });
//         if (!subscription) {
//             throw new Error("Subscription not found");
//         }
//         const limit = subscription.plan.featureLimits[0]?.limitValue ?? 0;
//         return {
//             allowed: (usage?.currentUsed ?? 0) < limit,
//             used: usage?.currentUsed ?? 0,
//             limit,
//         };
//     }
//     /**
//      * Increment usage
//      */
//     async incrementFeatureUsage(
//         subscriptionId: string,
//         featureKey: FeatureKey,
//         amount = 1
//     ) {
//         const check = await this.checkFeatureLimit(
//             subscriptionId,
//             featureKey
//         );
//         if (!check.allowed) {
//             throw new Error("Feature limit exceeded.");
//         }
//         const feature = await prisma.featureLimits.findFirst({
//             where: {
//                 featureKey,
//             },
//         });
//         return prisma.featureLimitUsages.update({
//             where: {
//                 subscriptionId_featureKey: {
//                     subscriptionId,
//                     featureKey,
//                 },
//             },
//             data: {
//                 currentUsed: {
//                     increment: amount
//                 }
//             }
//         });
//     }
//     /**
//      * Reset usages
//      */
//     async resetFeatureUsage(subscriptionId: string) {
//         return prisma.featureLimitUsages.updateMany({
//             where: {
//                 subscriptionId,
//             },
//             data: {
//                 currentUsed: 0,
//             },
//         });
//     }
//     /**
//      * Remaining feature count
//      */
//     async getRemainingLimit(
//         subscriptionId: string,
//         featureKey: FeatureKey
//     ) {
//         const result = await this.checkFeatureLimit(
//             subscriptionId,
//             featureKey
//         );
//         return result.limit - result.used;
//     }
//     /**
//      * Initialize usage records
//      */
// }
//# sourceMappingURL=feature-limit.service.js.map