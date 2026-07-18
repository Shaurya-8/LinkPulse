import { CreateLinkDto } from "../links.schema";
import { FeatureMapping } from "../feature-map"
import { FeatureRequest } from "../links.type"

export class LinkFeatureResolver {
    static resolve(dto: CreateLinkDto): FeatureRequest[] {
        return FeatureMapping
            .filter(item => item.enabled(dto))
            .map(item => ({
                featurekey: item.FeatureKey,
                amount: 1,
            }));
    }
}