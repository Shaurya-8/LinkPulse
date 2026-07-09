import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { verifyOtpSchema, resendOtpSchema } from "./otp.schema";
import { verify, resendOtp } from "./otp.controller"


const otpRouter = Router();

otpRouter.post('/verify',
    validate(verifyOtpSchema, 'body'),
    verify
);

otpRouter.post('/resend',
    validate(resendOtpSchema, 'body'),
    resendOtp
);

export { otpRouter }