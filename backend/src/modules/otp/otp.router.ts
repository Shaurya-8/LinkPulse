import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { verifyOtpSchema, resendOtpSchema } from "./otp.schema";
import { verify, resendOtp } from "./otp.controller"


const otpRouter = Router();

otpRouter.post('/verify',
    validate({ body: verifyOtpSchema.shape.body }),
    verify
);

otpRouter.post('/resend',
    validate({ body: resendOtpSchema.shape.body }),
    resendOtp
);

export { otpRouter }