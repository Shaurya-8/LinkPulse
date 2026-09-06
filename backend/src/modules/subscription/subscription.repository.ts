import { Prisma, PrismaClient, SubscriptionStatus } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { PlanId, SubscriptionId, UserId } from "../../types";
export class SubscriptionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    create(
        data: Prisma.SubscriptionsCreateInput,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.create({
            data,
        });
    }

    findById(
        id: SubscriptionId,
        tx: DbClient = this.prisma
    ) {
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

    findActiveWithFeatures(
        userId: UserId,
        tx: DbClient = this.prisma
    ) {
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

    findActiveByUserId(
        userId: UserId,
        tx: DbClient = this.prisma
    ) {
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

    findLatestByUserId(
        userId: UserId,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.findFirst({
            where: { userId },
            orderBy: {
                startedAt: "desc",
            },
        });
    }

    findManyByUserId(
        userId: UserId,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.findMany({
            where: { userId },
            orderBy: {
                startedAt: "desc",
            },
        });
    }

    updatePlan(
        subscriptionId: SubscriptionId,
        planId: PlanId,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.update({
            where: { id: subscriptionId },
            data: {
                planId,
            },
        });
    }

    renew(
        subscriptionId: string,
        expiresAt: Date,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.update({
            where: { id: subscriptionId },
            data: {
                expiresAt,
                status: SubscriptionStatus.ACTIVE,
            },
        });
    }

    updateStatus(
        subscriptionId: string,
        status: SubscriptionStatus,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.update({
            where: {
                id: subscriptionId,
            },
            data: {
                status,
            },
        });
    }

    expireSubscriptions(
        subscriptionId: SubscriptionId,
        tx: DbClient = this.prisma,
        now = new Date()
    ) {
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

    delete(
        id: string,
        tx: DbClient = this.prisma
    ) {
        return tx.subscriptions.delete({
            where: { id },
        });
    }

    existsActiveSubscription(
        userId: string,
        tx: DbClient = this.prisma
    ) {
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