import * as otpServie from "./otp.service";
import { logger } from "../../common/utils/logger";
import { BadRequestError } from "../../common/errors/AppError";
import { OtpPurpose } from "../../types";
import { setAuthCookies } from "../../common/utils/cookies";
import { successResponse } from "../../common/utils/response";
const RESPONCE_MASSAGE = {
    [OtpPurpose.EMAIL_VERIFICATION]: "Email Verified Successfully",
    [OtpPurpose.PASSWORD_RESET]: "Password reset successfull"
};
function getDevice(req) {
    const device = req.deviceInfo;
    if (!device) {
        logger.error('device info not Found');
        throw new BadRequestError('Unable to get device info');
    }
    return device;
}
export async function verify(req, res, next) {
    const device = getDevice(req);
    const verificationData = req.validated.body;
    try {
        const result = await otpServie.verify(verificationData, device);
        if (result.tokens && result.sessionId) {
            setAuthCookies(res, {
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                sessionId: result.sessionId
            });
        }
        successResponse(res, result.data, RESPONCE_MASSAGE[verificationData.purpose]);
    }
    catch (err) {
        next(err);
    }
}
export async function resendOtp(req, res, next) {
    const device = getDevice(req);
    try {
        const result = await otpServie.resendOtp(req.validated.body, device);
        successResponse(res, result, "Resend OTP succefully");
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=otp.controller.js.map