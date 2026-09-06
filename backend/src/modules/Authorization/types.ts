import { Prisma } from "../../../generated/prisma/client";
import { FeatureId, UserId } from "../../types";
import { CreateLinkInput } from "../links/links.schema";

// ───────────────────────────────────────────────────────────────
// Authorization 
// ───────────────────────────────────────────────────────────────
export interface AuthorizationCreateLinkInput extends CreateLinkInput {
    userId: UserId
}

export type FeatureLimitInfo = {
    featureId: FeatureId;
    limitValue: number;
};