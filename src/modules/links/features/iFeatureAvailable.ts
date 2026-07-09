import { UserId } from "../../../types";

export interface IFeaturesAvailable {
    isAllowedAlias: (userId: UserId) => boolean;
    isAllowedPassword: (userId: UserId) => boolean;
    isAllowedQrCode: (userId: UserId) => boolean;
    isAllowedcustomExpiry: (userId: UserId) => boolean;
    // isAllowedCustom: (userId: UserId) => boolean;
}