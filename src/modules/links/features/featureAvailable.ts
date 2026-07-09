import { IFeaturesAvailable } from "./IFeatureAvailable";
import { UserId } from "../../../types";
import { User } from "../../../../generated/prisma/client";
import { UserRepository } from "../../auth/auth.repository";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../common/errors/AppError";
export class FeatureAvailable implements IFeaturesAvailable {

    constructor(private user: User) { }

    isAllowedAlias(userId: UserId): boolean {
        // this.user.
        return !!userId
    }
    isAllowedPassword(userId: UserId): boolean {
        return !!userId
    }
    isAllowedQrCode(userId: UserId): boolean {
        return !!userId
    }
    isAllowedcustomExpiry(userId: UserId): boolean {
        return !!userId
    }
}