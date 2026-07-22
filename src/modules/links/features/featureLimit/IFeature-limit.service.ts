// export interface IFeatureLimitService {
//     initializeSubscriptionUsage(
//         subscriptionId: string,
//         planId: string
//     ): Promise<void>;

//     consume(
//         subscriptionId: string,
//         featureKey: string,
//         amount?: number
//     ): Promise<void>;

//     hasQuota(
//         subscriptionId: string,
//         featureKey: string,
//         amount?: number
//     ): Promise<boolean>;

//     getRemaining(
//         subscriptionId: string,
//         featureKey: string
//     ): Promise<number>;

//     resetUsage(
//         subscriptionId: string
//     ): Promise<void>;

//     syncPlanLimits(
//         subscriptionId: string,
//         planId: string
//     ): Promise<void>;

//     restore(
//         subscriptionId: string,
//         featureKey: string,
//         amount?: number
//     ): Promise<void>;
// }