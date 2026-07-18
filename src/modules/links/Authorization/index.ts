import { DbClient } from "../../../config/prisma";
import { SubscriptionId, UserId } from "../../../types";
import { SubscriptionService } from "../../subscription/subscription.service";
import { FeatureLimitService } from "../features/featureLimit/feature-limit.service";
import { FeatureLimitUsedService } from "../features/featureLimitUsed/featureUsed-limit.service";
import { CreateLinkAuthorization } from "./create-link.authorization";
import { AuthorizationCreateLinkDto } from "./types";
import { SubscriptionWithFeatures } from "../../subscription/types";



export class Authorization {
    cachedSubscription: SubscriptionWithFeatures | null = null;

    private _subscriptionService?: SubscriptionService;
    private _featureLimitService?: FeatureLimitService;
    private _featureLimitUsedService?: FeatureLimitUsedService;

    get subscriptionService() {
        return this._subscriptionService ??= new SubscriptionService();
    }
    get featureLimitService() {
        return this._featureLimitService ??= new FeatureLimitService();
    }
    get featureLimitUsedService() {
        return this._featureLimitUsedService ??= new FeatureLimitUsedService();
    }

    private async getSubscription(userId: UserId, tx?: DbClient) {
        if (this.cachedSubscription) {
            return this.cachedSubscription;
        }
        this.cachedSubscription = await this.subscriptionService.getWithFeatureLimitFeatures(userId, tx);
        return this.cachedSubscription;
    }
    async createLinkAuthorization(dto: AuthorizationCreateLinkDto, tx?: DbClient) {
        const subscription = await this.getSubscription(dto.userId, tx);
        const update = new CreateLinkAuthorization(subscription.features, tx).authorize(dto);

        await this.featureLimitUsedService.lock(subscription.id as SubscriptionId, update.map(f => (f.featureKey)), tx);
        await this.featureLimitUsedService.bulkUpdate(subscription.id as SubscriptionId, update, tx);
    }
}