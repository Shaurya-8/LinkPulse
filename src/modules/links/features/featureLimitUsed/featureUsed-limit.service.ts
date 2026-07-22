import { BatchPayload } from "../../../../../generated/prisma/internal/prismaNamespace";

import { DbClient, prisma } from "../../../../config/prisma";
import { FeatureKey, FeatureUsages } from "../../../../../generated/prisma/client";

import { FeatureId, PlanId, SubscriptionId } from "../../../../types";


import { BadRequestError } from "../../../../common/errors/AppError";

import { FeatureLimitUsedRepository } from "./featureUsed-limit.repository";


export class FeatureUsedService {
    cashedFeaturesLimitUsed: FeatureUsages[] | null = null;
    // featureLimitService = new FeatureLimitService();
    featureLimitUsedRepository = new FeatureLimitUsedRepository(prisma);

    async lock(subscriptionId: SubscriptionId,
        featureKeys: FeatureKey[],
        tx?: DbClient): Promise<void> {
        return this.featureLimitUsedRepository.lock(subscriptionId, featureKeys, tx);
    }
    async getBySubscription(SubscriptionId: SubscriptionId, tx?: DbClient): Promise<FeatureUsages[]> {
        if (this.cashedFeaturesLimitUsed) {
            return this.cashedFeaturesLimitUsed;
        }
        const featuresLimitUsed = await this.featureLimitUsedRepository.getByPlanId(SubscriptionId, tx);

        if (!featuresLimitUsed) {
            throw new BadRequestError("unable to get Features")
        }
        this.cashedFeaturesLimitUsed = featuresLimitUsed;
        return featuresLimitUsed;
    }

    async getById(id: string, tx?: DbClient): Promise<FeatureUsages> {
        const featureLimitUsed = await this.featureLimitUsedRepository.getById(id, tx);
        if (!featureLimitUsed) {
            throw new BadRequestError("unable to get feature limit used");
        }
        return featureLimitUsed;
    }

    async create(subscriptionId: SubscriptionId,
        featureKey: FeatureKey,
        tx?: DbClient
    ): Promise<FeatureUsages> {
        return this.featureLimitUsedRepository.create({
            subscriptionId,
            featureKey: featureKey
        }, tx);
    }

    async createMany(
        subscriptionId: SubscriptionId,
        limits: {
            featureKey: FeatureKey;
        }[],
        tx?: DbClient
    ): Promise<BatchPayload> {
        return this.featureLimitUsedRepository.createMany(
            limits.map(({ featureKey }) => ({
                subscriptionId,
                featureKey,
            }), tx)
        );
    }

    async upsert() { }

    async bulkUpdate(
        subscriptionId: SubscriptionId,
        updates: { featureKey: FeatureKey, currentUsed: number }[],
        tx?: DbClient
    ): Promise<void> {
        await Promise.all(
            updates.map(update =>
                this.featureLimitUsedRepository.updateByFeature(
                    subscriptionId,
                    update.featureKey,
                    update.currentUsed, tx
                ))
        );
    }
}