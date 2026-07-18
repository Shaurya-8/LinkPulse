import { Prisma, PrismaClient, FeatureKey } from "../../../../../generated/prisma/client";
import { DbClient } from "../../../../config/prisma";

import { SubscriptionId } from "../../../../types";

export class FeatureLimitUsedRepository {
    constructor(private readonly db: DbClient) { }


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
        return tx?.featureLimitUsages.findUnique({
            where: { id }
        });
    }

    getByPlanId(subscriptionId: SubscriptionId, tx: DbClient = this.db) {
        return tx.featureLimitUsages.findMany({
            where: {
                subscriptionId
            }
        });
    }

    create(data: Prisma.FeatureLimitUsagesUncheckedCreateInput, tx: DbClient = this.db) {
        return tx.featureLimitUsages.create({
            data
        });
    }

    createMany(data: Prisma.FeatureLimitUsagesCreateManyInput[], tx: DbClient = this.db) {
        return tx.featureLimitUsages.createMany({
            data
        });
    }

    updateByFeature(subscriptionId: SubscriptionId, featureKey: FeatureKey, currentUsed: number, tx: DbClient = this.db) {
        return tx.featureLimitUsages.update({
            where: {
                subscriptionId_featureKey: {
                    subscriptionId,
                    featureKey
                }
            },
            data: { currentUsed }
        })
    }



}