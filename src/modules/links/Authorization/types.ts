import { Prisma } from "../../../../generated/prisma/client";
import { FeatureId, UserId } from "../../../types";
import { CreateLinkDto } from "../links.schema";

// ───────────────────────────────────────────────────────────────
// Authorization 
// ───────────────────────────────────────────────────────────────
export interface AuthorizationCreateLinkDto extends CreateLinkDto {
    userId: UserId
}

export type FeatureLimitInfo = {
    featureId: FeatureId;
    limitValue: number;
};