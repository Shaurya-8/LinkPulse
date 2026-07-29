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
});
//# sourceMappingURL=otp.schema.js.map