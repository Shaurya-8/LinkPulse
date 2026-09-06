import { Prisma, PrismaClient, FeatureKey, LinkClicks } from "../../../../../generated/prisma/client";
import { LinkClicksCountArgs } from "../../../../../generated/prisma/models";
import { DbClient } from "../../../../config/prisma";

import { SubscriptionId, UserId } from "../../../../types";

export class FeatureLimitUsedRepository {
    constructor(private readonly db: DbClient) { }



    count<T extends Prisma.LinkClicksCountArgs>(
        args: Prisma.SelectSubset<T, LinkClicksCountArgs>,
        tx: DbClient = this.db
    ){
        return tx.linkClicks.count(args)
    }

    async lock(
        subscriptionId: SubscriptionId,
        featureKeys: FeatureKey[],
        tx: DbClient = this.db
    ) {
        await tx.$queryRaw`
            SELECT *
            FROM feature_limit_usages
            WHERE subscription_id = ${subscriptionId}
            AND feature_key = ANY(${featureKeys}::"FeatureKey"[])
            FOR UPDATE
        `;
    }



    getById(id: string, tx: DbClient = this.db) {
        return tx?.featureUsages.findUnique({
            where: { id }
        });
    }

    getByPlanId(subscriptionId: SubscriptionId, tx: DbClient = this.db) {
        return tx.featureUsages.findMany({
            where: {
                subscriptionId
            }
        });
    }

    create(data: Prisma.FeatureUsagesUncheckedCreateInput, tx: DbClient = this.db) {
        return tx.featureUsages.create({
            data
        });
    }

    createMany(data: Prisma.FeatureUsagesCreateManyInput[], tx: DbClient = this.db) {
        return tx.featureUsages.createMany({
            data
        });
    }

    updateByFeature(subscriptionId: SubscriptionId, featureKey: FeatureKey, currentUsed: number, tx: DbClient = this.db) {
        return tx.featureUsages.update({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey
                }
            },
            data: { currentUsed }
        })
    }


    countLastMonth(
        userId: UserId,
        tx: DbClient = this.db
    ) {
        return tx.linkClicks.count({
            where: {
                link: { userId },
                isBot: false,
                clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        })
    }


}