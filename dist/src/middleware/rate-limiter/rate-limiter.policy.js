import { opts } from "./options";
import { RateLimitKeys } from "./key";
export const policies = {
    // --------------------------------------------------------------------------
    // Global
    // --------------------------------------------------------------------------
    global: [
        {
            name: "global-ip",
            limiter: opts.globalLimiter,
            key: RateLimitKeys.ip,
        },
        {
            name: "global-authenticated",
            limiter: opts.globalAuthenticatedLimiter,
            key: RateLimitKeys.email,
            skip: (req) => !req.body.email,
        },
    ],
    // --------------------------------------------------------------------------
    // Login
    // --------------------------------------------------------------------------
    login: [
        {
            name: "login-ip",
            limiter: opts.loginIpLimiter,
            key: RateLimitKeys.ip,
        },
        {
            name: "login-email",
            limiter: opts.loginEmailLimiter,
            key: RateLimitKeys.email,
            skip: (req) => !req.body.email,
        },
        {
            name: "login-email-ip",
            limiter: opts.loginEmailIpLimiter,
            key: RateLimitKeys.emailIp,
            skip: (req) => !req.body.email,
        },
    ],
    // --------------------------------------------------------------------------
    // Registration
    // --------------------------------------------------------------------------
    register: [
        {
            name: "register-ip",
            limiter: opts.registerIpLimiter,
            key: RateLimitKeys.ip,
        },
        {
            name: "register-ip-day",
            limiter: opts.registerIpPerDayLimiter,
            key: RateLimitKeys.ip,
        },
        {
            name: "register-email",
            limiter: opts.registerEmailLimiter,
            key: RateLimitKeys.email,
            skip: (req) => !req.body.email,
        },
    ],
    // --------------------------------------------------------------------------
    // OTP Request
    // --------------------------------------------------------------------------
    otpRequest: [
        {
            name: "otp-request",
            limiter: opts.otpRequestLimiter,
            key: RateLimitKeys.requestId,
        },
        {
            name: "otp-request-day",
            limiter: opts.otpRequestPerDayLimiter,
            key: RateLimitKeys.requestId,
        },
    ],
    // --------------------------------------------------------------------------
    // OTP Resend
    // --------------------------------------------------------------------------
    otpResend: [
        {
            name: "otp-resend",
            limiter: opts.otpResendLimiter,
            key: RateLimitKeys.requestId,
        },
        {
            name: "otp-resend-day",
            limiter: opts.otpResendPerDayLimiter,
            key: RateLimitKeys.requestId,
        },
    ],
    // --------------------------------------------------------------------------
    // OTP Verify
    // --------------------------------------------------------------------------
    otpVerify: [
        {
            name: "otp-verify",
            limiter: opts.otpVerifyLimiter,
            key: RateLimitKeys.requestId,
        },
    ],
    // --------------------------------------------------------------------------
    // Forgot Password
    // --------------------------------------------------------------------------
    forgotPassword: [
        {
            name: "forgot-password",
            limiter: opts.forgotPasswordLimiter,
            key: RateLimitKeys.requestId,
        },
        {
            name: "forgot-password-day",
            limiter: opts.forgotPasswordPerDayLimiter,
            key: RateLimitKeys.requestId,
        },
    ],
    // --------------------------------------------------------------------------
    // Reset Password
    // --------------------------------------------------------------------------
    resetPassword: [
        {
            name: "reset-password",
            limiter: opts.resetPasswordLimiter,
            key: RateLimitKeys.requestId,
        },
    ],
};
//# sourceMappingURL=rate-limiter.policy.js.map