import { SubscriptionService } from "../subscription/subscription.service";
import { FeatureService } from "../links/features/feature.service";
import { FeatureUsedService } from "../links/features/featureLimitUsed/featureUsed-limit.service";
import { CreateLinkAuthorization } from "./create-link.authorization";
import { LinkService } from "../links/links.service";
import { RedirectLinkAuthentication } from "./redirect-link.authorization";
import { PlanType } from "../../../generated/prisma/client";
import { BadRequestError } from "../../common/errors/AppError";
import { UpdataLinkAuthorization } from "./update-link.authorization";
export class Authorization {
    cachedSubscription = null;
    _subscriptionService;
    _featuresService;
    _featureUsageService;
    _linkService;
    get subscriptionService() {
        return this._subscriptionService ??= new SubscriptionService();
    }
    get featuresService() {
        return this._featuresService ??= new FeatureService();
    }
    get featureUsageService() {
        return this._featureUsageService ??= new FeatureUsedService();
    }
    get linkService() {
        return this._linkService ??= new LinkService();
    }
    async getSubscription(userId, tx) {
        if (this.cachedSubscription) {
            return this.cachedSubscription;
        }
        this.cachedSubscription = await this.subscriptionService.getWithFeatureLimitFeatures(userId, tx);
        return this.cachedSubscription;
    }
    async createLinkAuthorization(dto, tx) {
        const subscription = await this.getSubscription(dto.userId, tx);
        const update = new CreateLinkAuthorization(subscription.features, tx).authorize(dto);
        await this.featureUsageService.lock(subscription.id, update.map(f => (f.featureKey)), tx);
        await this.featureUsageService.bulkUpdate(subscription.id, update, tx);
    }
    async redirectLinkAuthorization(linkData, isPasswordVerified, tx) {
        if (linkData.isActive && ((linkData.expiresAt?.getTime() ?? Infinity) <= Date.now())) {
            await this.linkService.expireCode(linkData.shortCode);
            return `/link/inactive?code=${linkData.shortCode}`;
        }
        return new RedirectLinkAuthentication(linkData).authorize(isPasswordVerified);
    }
    async updateLinkAuthorization(link, userId, role, input, tx) {
        const subscritption = await this.getSubscription(userId);
        if (subscritption.plan.name === PlanType.FREE) {
            throw new BadRequestError('Feature not available');
        }
        return new UpdataLinkAuthorization(link).authorize(subscritption, role, input);
    }
}
//# sourceMappingURL=index.js.map