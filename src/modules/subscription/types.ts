import { FeatureKey, Plans, Prisma, Subscriptions } from "../../../generated/prisma/client";
import { FeatureId } from "../../types";


// subscription Policy

// export type SubscriptionWithFeatureLimit = Prisma.SubscriptionsGetPayload<{
//     include: {
//         plan: {
//             include: {
//                 featureLimits: true
//             },
//         },
//         featureUsage: true
//     },
// }>;


export type SubscriptionWithPlan = Prisma.SubscriptionsGetPayload<{
    include: {
        plan: true
    }
}>

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
    plan: Plans
}