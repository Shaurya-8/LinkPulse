import { Request } from "express";
import { UserId } from "../../types";
import { FeatureKey } from "../../../generated/prisma/enums";

// export interface AthorizationContext extends Request{
//     user: UserId
//     action: 'CREATE_LINK',
//     resource: 'link',

// }

// export enum FeatureKey {
//     LINKS_CREATED = "LINKS_CREATED",
//     CUSTOM_ALIAS = "CUSTOM_ALIAS",
//     PASSWORD_PROTECTED_LINKS = "PASSWORD_PROTECTED_LINKS",
//     EXPIRING_LINKS = "EXPIRING_LINKS",
//     ONE_TIME_LINKS = "ONE_TIME_LINKS",
// }
export interface FeatureRequest {
    featurekey: FeatureKey;
    amount: number;
}


export interface CreateLinks {
    id: string;
    shortCode: string;
    customAlias: string | null;
    longUrl: string;
    normalizedUrl: string;
    isOneTime: boolean;
    title: string | null;
    description: string | null;
    faviconUrl: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    passwordHash: string | null;
    totalClicks: number;
    clickLimit: number;
    userId: string;
}

