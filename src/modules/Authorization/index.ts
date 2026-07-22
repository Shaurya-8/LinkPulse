import { DbClient } from "../../config/prisma";
import {  SubscriptionId, UserId } from "../../types";
import { SubscriptionService } from "../subscription/subscription.service";
import { FeatureService } from "../links/features/feature.service";
import { FeatureUsedService } from "../links/features/featureLimitUsed/featureUsed-limit.service";
import { CreateLinkAuthorization } from "./create-link.authorization";
import { AuthorizationCreateLinkInput } from "./types";
import { SubscriptionWithFeatures } from "../subscription/types";
import { LinkService } from "../links/links.service";
import { RedirectLinkAuthentication } from "./redirect-link.authorization";
import { LinkWithRelations } from "../links/links.repository";

export class Authorization {
    cachedSubscription: SubscriptionWithFeatures | null = null;

    private _subscriptionService?: SubscriptionService;
    private _featuresService?: FeatureService;
    private _featureUsageService?: FeatureUsedService;
    private _linkService?: LinkService;
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


    private async getSubscription(userId: UserId, tx?: DbClient) {
        if (this.cachedSubscription) {
            return this.cachedSubscription;
        }
        this.cachedSubscription = await this.subscriptionService.getWithFeatureLimitFeatures(userId, tx);
        return this.cachedSubscription;
    }
    async createLinkAuthorization(dto: AuthorizationCreateLinkInput, tx?: DbClient) {
        const subscription = await this.getSubscription(dto.userId, tx);
        const update = new CreateLinkAuthorization(subscription.features, tx).authorize(dto);

        await this.featureUsageService.lock(subscription.id as SubscriptionId, update.map(f => (f.featureKey)), tx);
        await this.featureUsageService.bulkUpdate(subscription.id as SubscriptionId, update, tx);
    }

    async redirectLinkAuthorization(linkData: LinkWithRelations, isPasswordVerified: boolean, tx?: DbClient) {
        if (linkData.isActive && ((linkData.expiresAt?.getTime() ?? Infinity) <= Date.now())) {
            await this.linkService.expireCode(linkData.shortCode);
            return `/link/inactive?code=${linkData.shortCode}`;
        }
        return new RedirectLinkAuthentication(linkData).authorize(isPasswordVerified);

    }
}