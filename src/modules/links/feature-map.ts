import { CreateLinkDto } from "./links.schema";

import { FeatureKey } from "../../../generated/prisma/enums";
export const FeatureMapping = [
    {
        FeatureKey: FeatureKey.CREATE_LINK,
        enabled: () => true,
    },
    {
        FeatureKey: FeatureKey.CUSTOM_ALIAS,
        enabled: (dto: CreateLinkDto) => !!dto.customAlias,
    },
    {
        FeatureKey: FeatureKey.PASSWORD_PROTECTION,
        enabled: (dto: CreateLinkDto) => !!dto.passwordHash,
    },
    {
        FeatureKey: FeatureKey.LINK_EXPIRATION,
        enabled: (dto: CreateLinkDto) => !!dto.expiresAt,
    },
    {
        FeatureKey: FeatureKey.ONE_TIME_LINKS,
        enabled: (dto: CreateLinkDto) => dto.isOneTime === true,
    },
];
