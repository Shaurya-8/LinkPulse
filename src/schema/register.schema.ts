// auth.schema.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().toLowerCase(),

  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number")
    .regex(/[^A-Za-z0-9]/, "Password must contain special character"),

  firstName: z.string().trim().min(1).max(50).optional(),

  lastName: z.string().trim().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailOtpSchema = z.object({
  email: z.email().toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const resendOtpSchema = z.object({
  email: z.email().toLowerCase(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const sessionParamsSchema = z.object({
  sessionId: z.uuid(),
});

export type RegisterDTO = z.output<typeof registerSchema>;
export type LoginDTO = z.output<typeof loginSchema>;
export type VerifyEmailOtpDTO = z.output<typeof verifyEmailOtpSchema>;
export type ResendOtpDTO = z.output<typeof resendOtpSchema>;
export type RefreshTokenDTO = z.output<typeof refreshTokenSchema>;