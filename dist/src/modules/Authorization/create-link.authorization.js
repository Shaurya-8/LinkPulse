import { LinkFeatureResolver } from "../links/features/link-feature.resolver";
export class CreateLinkAuthorization {
    featureState;
    constructor(featureState, tx) {
        this.featureState = featureState;
    }
    authorize(dto) {
        const mappedFeature = LinkFeatureResolver.resolve(dto);
        return this.consume(mappedFeature, this.featureState);
    }
    consume(requests, featureState) {
        const updates = [];
        console.log("featureState:", this.featureState);
        console.log("requests:", requests);
        for (const request of requests) {
            const state = featureState[request.featurekey];
            if (!state) {
                throw new Error(`Feature ${request.featurekey} not available.`);
            }
            // 0 means feature unavailable
            if (state.limit === 0) {
                throw new Error(`Feature ${request.featurekey} not available.`);
            }
            // -1 means unlimited
            if (state.limit !== -1) {
                const next = state.used + request.amount;
                if (next > state.limit) {
                    throw new Error(`Limit exceeded for ${request.featurekey}`);
                }
                state.used = next;
            }
            updates.push({
                featureKey: request.featurekey,
                currentUsed: state.used
            });
        }
        return updates;
    }
}
//# sourceMappingURL=create-link.authorization.js.map