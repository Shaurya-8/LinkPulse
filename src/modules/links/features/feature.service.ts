import { SubscriptionError } from "../../../common/errors/AppError";
import { DbClient, prisma } from "../../../config/prisma";
import { PlanId } from "../../../types";
import { FeaturesRepository } from "./feature.repository";

export class FeatureService {
    featuresRepository = new FeaturesRepository(prisma);

    async getFeaturKey(planId: PlanId, tx?: DbClient) {
        const feature = await this.featuresRepository.findFeatureKey(planId, tx);
        if (!feature) throw new SubscriptionError("plan not found");
        return feature;
    }
}