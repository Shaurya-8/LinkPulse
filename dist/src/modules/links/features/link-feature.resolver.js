import { FeatureMapping } from "../feature-map";
export class LinkFeatureResolver {
    static resolve(dto) {
        return FeatureMapping
            .filter(item => item.enabled(dto))
            .map(item => ({
            featurekey: item.FeatureKey,
            amount: 1,
        }));
    }
}
//# sourceMappingURL=link-feature.resolver.js.map