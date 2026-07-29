import { prisma } from "../../../../config/prisma";
import { BadRequestError } from "../../../../common/errors/AppError";
import { FeatureLimitUsedRepository } from "./featureUsed-limit.repository";
export class FeatureUsedService {
    cashedFeaturesLimitUsed = null;
    // featureLimitService = new FeatureLimitService();
    featureLimitUsedRepository = new FeatureLimitUsedRepository(prisma);
    async lock(subscriptionId, featureKeys, tx) {
        return this.featureLimitUsedRepository.lock(subscriptionId, featureKeys, tx);
    }
    async getBySubscription(SubscriptionId, tx) {
        if (this.cashedFeaturesLimitUsed) {
            return this.cashedFeaturesLimitUsed;
        }
        const featuresLimitUsed = await this.featureLimitUsedRepository.getByPlanId(SubscriptionId, tx);
        if (!featuresLimitUsed) {
            throw new BadRequestError("unable to get Features");
        }
        this.cashedFeaturesLimitUsed = featuresLimitUsed;
        return featuresLimitUsed;
    }
    async getById(id, tx) {
        const featureLimitUsed = await this.featureLimitUsedRepository.getById(id, tx);
        if (!featureLimitUsed) {
            throw new BadRequestError("unable to get feature limit used");
        }
        return featureLimitUsed;
    }
    async create(subscriptionId, featureKey, tx) {
        return this.featureLimitUsedRepository.create({
            subscriptionId,
            featureKey: featureKey
        }, tx);
    }
    async createMany(subscriptionId, limits, tx) {
        return this.featureLimitUsedRepository.createMany(limits.map(({ featureKey }) => ({
            subscriptionId,
            featureKey,
        }), tx));
    }
    async upsert() { }
    async bulkUpdate(subscriptionId, updates, tx) {
        await Promise.all(updates.map(update => this.featureLimitUsedRepository.updateByFeature(subscriptionId, update.featureKey, update.currentUsed, tx)));
    }
}
//# sourceMappingURL=featureUsed-limit.service.js.map