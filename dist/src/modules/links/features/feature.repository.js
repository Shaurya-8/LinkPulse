export class FeaturesRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // =====================================================
    // Features
    // =====================================================
    findById(id, tx = this.prisma) {
        return tx.featureUsages.findUnique({
            where: { id },
        });
    }
    findByKey(featureKey, tx = this.prisma) {
        return tx.features.findFirst({
            where: { featureKey },
        });
    }
    findFeatureKey(planId, tx = this.prisma) {
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
    create(data, tx = this.prisma) {
        return tx.featureUsages.create({
            data,
        });
    }
    createMany(data, tx = this.prisma) {
        return tx.featureUsages.createMany({
            data,
            skipDuplicates: true,
        });
    }
    update(id, data, tx = this.prisma) {
        return tx.featureUsages.update({
            where: { id },
            data,
        });
    }
    delete(id, tx = this.prisma) {
        return tx.featureUsages.delete({
            where: { id },
        });
    }
    // =====================================================
    // Plan Limits
    // =====================================================
    findPlanFeatureLimit(planId, featureKey, tx = this.prisma) {
        return tx.features.findUnique({
            where: {
                planId_featureKey: {
                    planId,
                    featureKey,
                },
            },
        });
    }
    findPlanLimits(planId, tx = this.prisma) {
        return tx.features.findMany({
            where: {
                planId,
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }
    upsertPlanLimit(planId, featureKey, limitValue, tx = this.prisma) {
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
    deletePlanLimits(planId, tx = this.prisma) {
        return tx.features.deleteMany({
            where: {
                planId,
            },
        });
    }
    // =====================================================
    // Feature Usage
    // =====================================================
    findUsage(subscriptionId, featureKey, tx = this.prisma) {
        return tx.featureUsages.findUnique({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey,
                },
            },
        });
    }
    findSubscriptionUsage(subscriptionId, tx = this.prisma) {
        return tx.featureUsages.findMany({
            where: {
                subscriptionId,
            },
            orderBy: {
                featureKey: "asc",
            },
        });
    }
    initializeUsage(data, tx = this.prisma) {
        return tx.featureUsages.createMany({
            data,
            skipDuplicates: true,
        });
    }
    incrementUsage(subscriptionId, featureKey, amount, tx = this.prisma) {
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
    decrementUsage(subscriptionId, featureKey, amount, tx = this.prisma) {
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
    resetUsage(subscriptionId, tx = this.prisma) {
        return tx.featureUsages.updateMany({
            where: {
                subscriptionId,
            },
            data: {
                currentUsed: 0,
            },
        });
    }
    deleteUsage(subscriptionId, featureKey, tx = this.prisma) {
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
    async getFeatureQuota(subscriptionId, featureKey, tx = this.prisma) {
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
        if (!subscription)
            return null;
        const limit = subscription.plan.features.find(f => f.featureKey === featureKey);
        if (!limit)
            return null;
        const usage = subscription.featureUsage.find(u => u.featureKey === featureKey);
        const used = usage?.currentUsed ?? 0;
        return {
            featureKey,
            limit: limit.limitValue,
            used,
            remaining: Math.max(0, limit.limitValue - used),
        };
    }
    async getAllFeatureQuota(subscriptionId, tx = this.prisma) {
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
        if (!subscription)
            return [];
        const usageMap = new Map(subscription.featureUsage.map(u => [
            u.featureKey,
            u.currentUsed,
        ]));
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
//# sourceMappingURL=feature.repository.js.map