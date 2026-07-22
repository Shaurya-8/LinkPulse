import { Request, Response, NextFunction } from "express";
import * as otpServie from "./otp.service";
import { logger } from "../../common/utils/logger";
import { BadRequestError } from "../../common/errors/AppError";
import { DeviceInfo, OtpPurpose } from "../../types";
import { setAuthCookies } from "../../common/utils/cookies";
import { successResponse } from "../../common/utils/response";
import { VerifyOtpDto, ResendOtpDto } from "./otp.schema";
const RESPONCE_MASSAGE = {
    [OtpPurpose.EMAIL_VERIFICATION]: "Email Verified Successfully",
    [OtpPurpose.PASSWORD_RESET]: "Password reset successfull"

}
function getDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        logger.error('device info not Found');
        throw new BadRequestError('Unable to get device info');
    }
    return device
}

export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {

    const device = getDevice(req);
    const verificationDto = req.validated.body as VerifyOtpDto;

    try {

        const result = await otpServie.verify(verificationDto, device);
        if (result.tokens && result.sessionId) {
            setAuthCookies(res, {
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                sessionId: result.sessionId
            })
        }
        successResponse(res, result.data, RESPONCE_MASSAGE[verificationDto.purpose]);
    } catch (err) {
        next(err);
    }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction) {
    const device = getDevice(req);
    const resendDto = req.body as ResendOtpDto;
    try {
        const result = await otpServie.resendOtp(resendDto, device);
        successResponse(res, result, "Resend OTP succefully");
    } catch (err) {
        next(err);
    }
}