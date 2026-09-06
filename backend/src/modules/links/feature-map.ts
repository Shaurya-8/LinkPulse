import { CreateLinkInput } from "./links.schema";

import { FeatureKey } from "../../../generated/prisma/enums";
export const FeatureMapping = [
    {
        FeatureKey: FeatureKey.CREATE_LINK,
        enabled: () => true,
    },
    {
        FeatureKey: FeatureKey.CUSTOM_ALIAS,
        enabled: (dto: CreateLinkInput) => !!dto.customAlias,
    },
    {
        FeatureKey: FeatureKey.PASSWORD_PROTECTION,
        enabled: (dto: CreateLinkInput) => !!dto.passwordHash,
    },
    {
        FeatureKey: FeatureKey.LINK_EXPIRATION,
        enabled: (dto: CreateLinkInput) => !!dto.expiresAt,
    },
    {
        FeatureKey: FeatureKey.ONE_TIME_LINKS,
        enabled: (dto: CreateLinkInput) => dto.isOneTime === true,
    },
];
