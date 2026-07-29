import { FeatureKey } from "../../../generated/prisma/enums";
export const FeatureMapping = [
    {
        FeatureKey: FeatureKey.CREATE_LINK,
        enabled: () => true,
    },
    {
        FeatureKey: FeatureKey.CUSTOM_ALIAS,
        enabled: (dto) => !!dto.customAlias,
    },
    {
        FeatureKey: FeatureKey.PASSWORD_PROTECTION,
        enabled: (dto) => !!dto.passwordHash,
    },
    {
        FeatureKey: FeatureKey.LINK_EXPIRATION,
        enabled: (dto) => !!dto.expiresAt,
    },
    {
        FeatureKey: FeatureKey.ONE_TIME_LINKS,
        enabled: (dto) => dto.isOneTime === true,
    },
];
//# sourceMappingURL=feature-map.js.map