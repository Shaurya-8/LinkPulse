import { z } from "zod";
import { OtpPurpose } from "../../types";
export const verifyOtpSchema = z.object({
    verificationId: z.string().trim(),
    otp: z.string().trim(),
    requestId: z.string().trim(),
    purpose: z.enum(OtpPurpose)
});

export const resendOtpSchema = z.object({
    verificationId: z.string().trim(),
    requestId: z.string().trim(),
    purpose: z.enum(OtpPurpose)
})
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type ResendOtpDto = z.infer<typeof resendOtpSchema>;
