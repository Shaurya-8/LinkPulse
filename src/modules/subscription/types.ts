import { FeatureKey, Prisma, Subscriptions } from "../../../generated/prisma/client";
import { FeatureId } from "../../types";


// subscription Policy

export type SubscriptionWithFeatureLimit = Prisma.SubscriptionsGetPayload<{
    include: {
        plan: {
            include: {
                featureLimits: true
            },
        },
        featureUsage: true
    },
}>;


export type SubscriptionWithPlan = Prisma.SubscriptionsGetPayload<{
    include: {
        plan: true
    }
}>

// export enum FeatureKey {
//     CREATE_LINK = 'CREATE_LINK ',
//     CUSTOM_ALIAS = 'CUSTOM_ALIAS',
//     PASSWORD_PROTECTION = 'PASSWORD_PROTECTION',
//     LINK_EXPIRATION = 'LINK_EXPIRATION',
//     ONE_TIME_LINKS = "ONE_TIME_LINKS",
//     QR_CODE = 'QR_CODE',
//     CUSTOM_DOMAIN = 'CUSTOM_DOMAIN',
// }

export interface FeatureRequest {
    featureKey: FeatureKey;
    amount: number;
}


export interface SubscriptionFeature {
    limit: number;
    used: number;
}

export type FeatureState = Partial<
    Record<FeatureKey, SubscriptionFeature>
>;
export interface SubscriptionWithFeatures extends Subscriptions {
    features: FeatureState;
}