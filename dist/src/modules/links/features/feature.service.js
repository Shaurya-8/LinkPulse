import { SubscriptionError } from "../../../common/errors/AppError";
import { prisma } from "../../../config/prisma";
import { FeaturesRepository } from "./feature.repository";
export class FeatureService {
    featuresRepository = new FeaturesRepository(prisma);
    async getFeaturKey(planId, tx) {
        const feature = await this.featuresRepository.findFeatureKey(planId, tx);
        if (!feature)
            throw new SubscriptionError("plan not found");
        return feature;
    }
}
//# sourceMappingURL=feature.service.js.map