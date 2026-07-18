import { Prisma, PrismaClient, FeatureLimitUsages, FeatureLimits, FeatureKey } from "../../../../generated/prisma/client";
import { DbClient } from "../../../config/prisma";

export class FeatureRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // =====================================================
    // Features
    // =====================================================

    findById(
        id: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.findUnique({
            where: { id },
        });
    }

    findByKey(
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findFirst({
            where: { featureKey },
        });
    }

    create(
        data: Prisma.FeatureLimitUsagesCreateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.create({
            data,
        });
    }

    createMany(
        data: Prisma.FeatureLimitUsagesCreateManyInput[],
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.createMany({
            data,
            skipDuplicates: true,
        });
    }

    update(
        id: string,
        data: Prisma.FeatureLimitsUpdateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.update({
            where: { id },
            data,
        });
    }

    delete(
        id: string,
        tx: DbClient = this.prisma
    ) {

        return tx.featureLimitUsages.delete({
            where: { id },
        });
    }


    // =====================================================
    // Plan Limits
    // =====================================================



    findPlanFeatureLimit(
        planId: string,
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findUnique({
            where: {
                planId_featureKey: {
                    planId,
                    featureKey,
                },
            },
        });
    }

    findPlanLimits(
        planId: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.findMany({
            where: {
                planId,
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }

    upsertPlanLimit(
        planId: string,
        featureKey: FeatureKey,
        limitValue: number,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimits.upsert({
            where: {
                planId_featureKey: {
                    planId,
                    featureKey,
                },
            },
            create: {
                planId,
                featureKey,
                limitValue,
            },
            update: {
                limitValue,
            },
        });
    }

    deletePlanLimits(
        planId: string,
        tx: DbClient = this.prisma
    ): Promise<Prisma.BatchPayload> {
        return tx.featureLimits.deleteMany({
            where: {
                planId,
            },
        });
    }


    // =====================================================
    // Feature Usage
    // =====================================================


    findUsage(
        subscriptionId: string,
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.findUnique({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey,
                },
            },
        });
    }

    findSubscriptionUsage(
        subscriptionId: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.findMany({
            where: {
                subscriptionId,
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }


    initializeUsage(
        data: Prisma.FeatureLimitUsagesCreateManyInput[],
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.createMany({
            data,
            skipDuplicates: true,
        });
    }

    incrementUsage(
        subscriptionId: string,
        featureKey: FeatureKey,
        amount: number,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.update({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey,
                },
            },
            data: {
                currentUsed: {
                    increment: amount,
                },
            },
        });
    }

    decrementUsage(
        subscriptionId: string,
        featureKey: FeatureKey,
        amount: number,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.update({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey,
                },
            },
            data: {
                currentUsed: {
                    decrement: amount,
                },
            },
        });
    }

    resetUsage(
        subscriptionId: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.updateMany({
            where: {
                subscriptionId,
            },
            data: {
                currentUsed: 0,
            },
        });
    }

    deleteUsage(
        subscriptionId: string,
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.featureLimitUsages.delete({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey,
                },
            },
        });
    }

    // =====================================================
    // High-Level Queries
    // =====================================================

    async getFeatureQuota(
        subscriptionId: string,
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        const subscription = await tx.subscriptions.findUnique({
            where: { id: subscriptionId },
            include: {
                plan: {
                    include: {
                        featureLimits: true,
                    },
                },
                featureUsage: true,
            },
        });

        if (!subscription) return null;

        const limit = subscription.plan.featureLimits.find(
            f => f.featureKey === featureKey
        );

        if (!limit) return null;

        const usage = subscription.featureUsage.find(
            u => u.featureKey === featureKey
        );

        const used = usage?.currentUsed ?? 0;

        return {
            featureKey,
            limit: limit.limitValue,
            used,
            remaining: Math.max(0, limit.limitValue - used),
        };
    }
    async getAllFeatureQuota(
        subscriptionId: string,
        tx: DbClient = this.prisma
    ) {
        const subscription = await tx.subscriptions.findUnique({
            where: {
                id: subscriptionId,
            },
            include: {
                plan: {
                    include: {
                        featureLimits: true,
                    },
                },
                featureUsage: true,
            },
        });

        if (!subscription) return [];

        const usageMap = new Map(
            subscription.featureUsage.map(u => [
                u.featureKey,
                u.currentUsed,
            ])
        );

        return subscription.plan.featureLimits.map(limit => {
            const used = usageMap.get(limit.featureKey) ?? 0;

            return {
                featureKey: limit.featureKey,
                limit: limit.limitValue,
                used,
                remaining: Math.max(0, limit.limitValue - used),
            };
        });
    }
}