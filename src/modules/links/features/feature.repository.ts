import { Prisma, PrismaClient, FeatureUsages, Features, FeatureKey } from "../../../../generated/prisma/client";
import { DbClient } from "../../../config/prisma";
import { PlanId } from "../../../types";

export class FeaturesRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // =====================================================
    // Features
    // =====================================================

    findById(
        id: string,
        tx: DbClient = this.prisma
    ) {
        return tx.featureUsages.findUnique({
            where: { id },
        });
    }

    findByKey(
        featureKey: FeatureKey,
        tx: DbClient = this.prisma
    ) {
        return tx.features.findFirst({
            where: { featureKey },
        });
    }

    findFeatureKey(
        planId: PlanId,
        tx: DbClient = this.prisma
    ) {
        return tx.features.findMany({
            where: {
                planId,
            },
            select: {
                featureKey: true
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }

    create(
        data: Prisma.FeatureUsagesCreateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureUsages.create({
            data,
        });
    }

    createMany(
        data: Prisma.FeatureUsagesCreateManyInput[],
        tx: DbClient = this.prisma
    ) {
        return tx.featureUsages.createMany({
            data,
            skipDuplicates: true,
        });
    }

    update(
        id: string,
        data: Prisma.FeaturesUpdateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.featureUsages.update({
            where: { id },
            data,
        });
    }

    delete(
        id: string,
        tx: DbClient = this.prisma
    ) {

        return tx.featureUsages.delete({
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
        return tx.features.findUnique({
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
        return tx.features.findMany({
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
        return tx.features.upsert({
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
        return tx.features.deleteMany({
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
        return tx.featureUsages.findUnique({
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
        return tx.featureUsages.findMany({
            where: {
                subscriptionId,
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }


    initializeUsage(
        data: Prisma.FeatureUsagesCreateManyInput[],
        tx: DbClient = this.prisma
    ) {
        return tx.featureUsages.createMany({
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
        return tx.featureUsages.update({
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
        return tx.featureUsages.update({
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
        return tx.featureUsages.updateMany({
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
        return tx.featureUsages.delete({
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
                        features: true,
                    },
                },
                featureUsage: true,
            },
        });

        if (!subscription) return null;

        const limit = subscription.plan.features.find(
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
                        features: true,
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

        return subscription.plan.features.map(limit => {
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