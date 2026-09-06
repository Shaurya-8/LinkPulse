import { z } from "zod";
import { OtpPurpose } from "../../types";
export const verifyOtpSchema = z.object({
    body: z.object({

        verificationId: z.string().trim(),
        otp: z.string().trim(),
        requestId: z.string().trim(),
        purpose: z.enum(OtpPurpose)
    })
});

export const resendOtpSchema = z.object({
    body: z.object({
        verificationId: z.string().trim(),
        requestId: z.string().trim(),
        purpose: z.enum(OtpPurpose)
    })
})
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type ResendOtpInput = z.infer<typeof resendOtpSchema>['body'];
