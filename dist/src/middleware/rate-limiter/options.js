export const opts = {
    // --------------------------------------------------------------------------
    // Global
    // --------------------------------------------------------------------------
    globalLimiter: {
        keyPrefix: "rate-limit:global",
        points: 100,
        duration: 60,
        blockDuration: 60,
    },
    globalAuthenticatedLimiter: {
        keyPrefix: "rate-limit:global:authenticated",
        points: 500,
        duration: 60,
        blockDuration: 30,
    },
    // --------------------------------------------------------------------------
    // Login
    // --------------------------------------------------------------------------
    loginIpLimiter: {
        keyPrefix: "rate-limit:login:ip",
        points: 100,
        duration: 15 * 60,
        blockDuration: 15 * 60,
    },
    loginEmailLimiter: {
        keyPrefix: "rate-limit:login:email",
        points: 20,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    loginEmailIpLimiter: {
        keyPrefix: "rate-limit:login:email-ip",
        points: 5,
        duration: 90 * 24 * 60 * 60,
        blockDuration: 60 * 60,
    },
    // --------------------------------------------------------------------------
    // Registration
    // --------------------------------------------------------------------------
    registerIpLimiter: {
        keyPrefix: "rate-limit:register:ip",
        points: 5,
        duration: 60 * 60,
        blockDuration: 60 * 60,
    },
    registerIpPerDayLimiter: {
        keyPrefix: "rate-limit:register:ip-day",
        points: 20,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    registerEmailLimiter: {
        keyPrefix: "rate-limit:register:email",
        points: 5,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    // --------------------------------------------------------------------------
    // OTP Request
    // --------------------------------------------------------------------------
    otpRequestLimiter: {
        keyPrefix: "rate-limit:otp:request",
        points: 3,
        duration: 5 * 60,
        blockDuration: 5 * 60,
    },
    otpRequestPerDayLimiter: {
        keyPrefix: "rate-limit:otp:request-day",
        points: 20,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    // --------------------------------------------------------------------------
    // OTP Resend
    // --------------------------------------------------------------------------
    otpResendLimiter: {
        keyPrefix: "rate-limit:otp:resend",
        points: 3,
        duration: 5 * 60,
        blockDuration: 5 * 60,
    },
    otpResendPerDayLimiter: {
        keyPrefix: "rate-limit:otp:resend-day",
        points: 20,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    // --------------------------------------------------------------------------
    // OTP Verify
    // --------------------------------------------------------------------------
    otpVerifyLimiter: {
        keyPrefix: "rate-limit:otp:verify",
        points: 10,
        duration: 15 * 60,
        blockDuration: 15 * 60,
    },
    // --------------------------------------------------------------------------
    // Forgot Password
    // --------------------------------------------------------------------------
    forgotPasswordLimiter: {
        keyPrefix: "rate-limit:forgot-password",
        points: 3,
        duration: 15 * 60,
        blockDuration: 15 * 60,
    },
    forgotPasswordPerDayLimiter: {
        keyPrefix: "rate-limit:forgot-password-day",
        points: 10,
        duration: 24 * 60 * 60,
        blockDuration: 24 * 60 * 60,
    },
    // --------------------------------------------------------------------------
    // Reset Password
    // --------------------------------------------------------------------------
    resetPasswordLimiter: {
        keyPrefix: "rate-limit:reset-password",
        points: 5,
        duration: 15 * 60,
        blockDuration: 15 * 60,
    },
};
//# sourceMappingURL=options.js.map