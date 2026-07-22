import { DbClient } from "../../config/prisma";
import { FeatureId } from "../../types";
import { LinkFeatureResolver } from "../links/features/link-feature.resolver";
import { CreateLinkInput } from "../links/links.schema";
import { FeatureRequest } from "../links/links.type";
import { FeatureState } from "../subscription/types";
import { FeatureKey } from "../../../generated/prisma/enums";


export class CreateLinkAuthorization {
    constructor(
        private readonly featureState: FeatureState,
        tx?: DbClient
    ) { }


    authorize(dto: CreateLinkInput): { featureKey: FeatureKey, currentUsed: number }[] {
        const mappedFeature = LinkFeatureResolver.resolve(dto);
        return this.consume(mappedFeature, this.featureState);
    }

    private consume(
        requests: FeatureRequest[],
        featureState: FeatureState
    ): { featureKey: FeatureKey, currentUsed: number }[] {

        const updates: Array<{
            featureKey: FeatureKey;
            currentUsed: number;
        }> = [];

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
