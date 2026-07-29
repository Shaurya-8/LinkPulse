import { generateOtp, hashOtp, getOtpExpiry, verifyOtp } from "../../common/utils/crypto";
import { cache, cacheKeys } from "../../config/redis";
import { BadRequestError } from "../../common/errors/AppError";
import { OtpPurpose } from "../../types";
import { resetPassword, verifyEmail } from "../auth/auth.service";
import { config } from "../../config";
import { otpTemplateFactory } from "../email/email.template";
import { enqueueEmail } from "../../jobs/queues";
export async function create(verificationId) {
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiry = getOtpExpiry();
    cache.set(cacheKeys.otpVerify(verificationId), otpHash, expiry);
    return { otp, otpExpiresAt: expiry };
}
export async function verify(dto, device) {
    const cachedOtp = await cache.get(cacheKeys.otpVerify(dto.verificationId));
    if (!cachedOtp)
        throw new BadRequestError("OTP Expired");
    const verify = await verifyOtp(dto.otp, cachedOtp);
    if (!verify)
        throw new BadRequestError("Invalid OTP");
    void cache.del(cacheKeys.otpVerify(dto.verificationId));
    switch (dto.purpose) {
        case OtpPurpose.EMAIL_VERIFICATION:
            return await verifyEmail(dto.requestId, device);
        case OtpPurpose.PASSWORD_RESET:
            return await resetPassword(dto.requestId, device);
        default:
            throw new BadRequestError("Invalid OTP");
    }
}
export async function resendOtp(dto, device) {
    const otpSessionData = await cache.get(cacheKeys.otpSessionData(dto.requestId));
    console.log("cachedData: ", otpSessionData);
    if (!otpSessionData || !otpSessionData.recipient)
        throw new BadRequestError("Session expired");
    const { otp, otpExpiresAt } = await create(otpSessionData.verificationId); //otpExpireseAt in second
    const template = otpTemplateFactory({
        otp: otp,
        purpose: dto.purpose,
        expiresIn: config.otp.expiresMinutes
    });
    await enqueueEmail({ to: otpSessionData.recipient, ...template, });
    return;
}
//# sourceMappingURL=otp.service.js.map