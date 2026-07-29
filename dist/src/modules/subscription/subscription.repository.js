import { SubscriptionStatus } from "../../../generated/prisma/client";
export class SubscriptionRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data, tx = this.prisma) {
        return tx.subscriptions.create({
            data,
        });
    }
    findById(id, tx = this.prisma) {
        return tx.subscriptions.findUnique({
            where: { id },
            include: {
                plan: {
                    include: {
                        features: true
                    },
                },
                featureUsage: true,
            },
        });
    }
    findActiveWithFeatures(userId, tx = this.prisma) {
        return tx.subscriptions.findFirst({
            where: {
                userId,
                status: SubscriptionStatus.ACTIVE,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                plan: {
                    include: {
                        features: true
                    },
                },
                featureUsage: true,
            },
        });
    }
    findActiveByUserId(userId, tx = this.prisma) {
        return tx.subscriptions.findFirst({
            where: {
                userId,
                status: SubscriptionStatus.ACTIVE,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                plan: true,
            },
        });
    }
    findLatestByUserId(userId, tx = this.prisma) {
        return tx.subscriptions.findFirst({
            where: { userId },
            orderBy: {
                startedAt: "desc",
            },
        });
    }
    findManyByUserId(userId, tx = this.prisma) {
        return tx.subscriptions.findMany({
            where: { userId },
            orderBy: {
                startedAt: "desc",
            },
        });
    }
    updatePlan(subscriptionId, planId, tx = this.prisma) {
        return tx.subscriptions.update({
            where: { id: subscriptionId },
            data: {
                planId,
            },
        });
    }
    renew(subscriptionId, expiresAt, tx = this.prisma) {
        return tx.subscriptions.update({
            where: { id: subscriptionId },
            data: {
                expiresAt,
                status: SubscriptionStatus.ACTIVE,
            },
        });
    }
    updateStatus(subscriptionId, status, tx = this.prisma) {
        return tx.subscriptions.update({
            where: {
                id: subscriptionId,
            },
            data: {
                status,
            },
        });
    }
    expireSubscriptions(subscriptionId, tx = this.prisma, now = new Date()) {
        return tx.subscriptions.updateMany({
            where: {
                subscriptionId,
                expiresAt: {
                    lte: now,
                },
                status: {
                    in: [
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIAL,
                    ],
                },
            },
            data: {
                status: SubscriptionStatus.EXPIRED,
            },
        });
    }
    delete(id, tx = this.prisma) {
        return tx.subscriptions.delete({
            where: { id },
        });
    }
    existsActiveSubscription(userId, tx = this.prisma) {
        return tx.subscriptions.count({
            where: {
                userId,
                status: SubscriptionStatus.ACTIVE,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
    }
}
//# sourceMappingURL=subscription.repository.js.map