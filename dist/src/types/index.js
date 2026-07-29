export const asUserId = (id) => id;
/**
 *   All machine-readable error codes used in ApiResponse.meta.code.
 *   Keeping them as a const enum means they tree-shake to plain strings in output.
 */
//  ──────────────────────────────────────────────────────────────────────────
//  CACHE KEY TYPES
//  Typed namespacing for every Redis key pattern in the system.
/**
 *  Namespace prefixes for every Redis key in the system.
 *  Changing a prefix here causes a compile error anywhere the old value is used.
 */
export const CacheNamespace = {
    /** `otp:cooldown:<email>`      — per-email OTP resend cooldown (TTL key) */
    OTP_COOLDOWN: 'otp:cooldown',
    /** `revoked:access:<jti>`      — blocklisted access token JTIs */
    REVOKED_ACCESS: 'revoked:access',
    /** `user:sessions:<userId>`    — set of active session IDs per user */
    USER_SESSIONS: 'user:sessions',
    /** `user:<userId>`             — cached user object */
    USER_BY_ID: 'user',
    /** `user:email:<email>`        — userId lookup by email */
    USER_BY_EMAIL: 'user:email',
    /** `rate:login:<ip>`           — login attempt counter */
    RATE_LOGIN: 'rate:login',
    /** `rate:otp:<ip>:<email>`     — OTP resend counter */
    RATE_OTP: 'rate:otp',
    /** `rate:refresh:<ip>`         — token refresh counter */
    RATE_REFRESH: 'rate:refresh',
    /** `apiKey:<keyHash>`          — API key lookup by hashed key */
    API_KEY: 'apiKey',
};
// ═════════════════════════════════════════════════════════════════════════════
// 2. ENUMS
//    Mirrors the Prisma schema enums. Defined here so the rest of the app can
//    use them without importing @prisma/client everywhere.
// ═════════════════════════════════════════════════════════════════════════════
/** Lifecycle state of a user account */
/** Physical device category inferred from the User-Agent string */
export var DeviceType;
(function (DeviceType) {
    DeviceType["DESKTOP"] = "DESKTOP";
    DeviceType["MOBILE"] = "MOBILE";
    DeviceType["TABLET"] = "TABLET";
    DeviceType["UNKNOWN"] = "UNKNOWN";
})(DeviceType || (DeviceType = {}));
/** What the OTP was requested for — determines validity rules and email copy */
export var OtpPurpose;
(function (OtpPurpose) {
    OtpPurpose["EMAIL_VERIFICATION"] = "EMAIL_VERIFICATION";
    OtpPurpose["PASSWORD_RESET"] = "PASSWORD_RESET";
})(OtpPurpose || (OtpPurpose = {}));
/** Every auditable action in the system — kept in sync with schema.prisma */
export var AuditAction;
(function (AuditAction) {
    AuditAction["REGISTER"] = "REGISTER";
    AuditAction["OTP_SENT"] = "OTP_SENT";
    AuditAction["OTP_RESEND"] = "OTP_RESEND";
    AuditAction["OTP_VERIFY_SUCCESS"] = "OTP_VERIFY_SUCCESS";
    AuditAction["OTP_VERIFY_FAIL"] = "OTP_VERIFY_FAIL";
    AuditAction["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    AuditAction["LOGIN_FAIL"] = "LOGIN_FAIL";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["LOGOUT_ALL"] = "LOGOUT_ALL";
    AuditAction["TOKEN_REFRESHED"] = "TOKEN_REFRESHED";
    AuditAction["TOKEN_REVOKED"] = "TOKEN_REVOKED";
    AuditAction["EMAIL_VERIFIED"] = "EMAIL_VERIFIED";
    AuditAction["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    AuditAction["PASSWORD_RESET_REQUEST"] = "PASSWORD_RESET_REQUEST";
    AuditAction["PASSWORD_RESET_SUCCESS"] = "PASSWORD_RESET_SUCCESS";
    AuditAction["ACCOUNT_SUSPENDED"] = "ACCOUNT_SUSPENDED";
    AuditAction["ACCOUNT_DELETED"] = "ACCOUNT_DELETED";
    AuditAction["DEVICE_TRUSTED"] = "DEVICE_TRUSTED";
    AuditAction["DEVICE_REMOVED"] = "DEVICE_REMOVED";
    AuditAction["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    AuditAction["RATE_LIMIT_HIT"] = "RATE_LIMIT_HIT";
})(AuditAction || (AuditAction = {}));
// ═════════════════════════════════════════════════════════════════════════════
// 11. ERROR TYPES
// ═════════════════════════════════════════════════════════════════════════════
/**
 * All machine-readable error codes used in ApiResponse.meta.code.
 * Keeping them as a const enum means they tree-shake to plain strings in output.
 */
export const ErrorCode = {
    // 400
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    // 401
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    // 403
    FORBIDDEN: 'FORBIDDEN',
    // 404
    NOT_FOUND: 'NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    // 409
    CONFLICT: 'CONFLICT',
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    ALREADY_VERIFIED: 'ALREADY_VERIFIED',
    // 422
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
    // 429
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    AUTH_RATE_LIMIT_EXCEEDED: 'AUTH_RATE_LIMIT_EXCEEDED',
    OTP_RATE_LIMIT_EXCEEDED: 'OTP_RATE_LIMIT_EXCEEDED',
    REFRESH_RATE_LIMIT_EXCEEDED: 'REFRESH_RATE_LIMIT_EXCEEDED',
    OTP_COOLDOWN: 'OTP_COOLDOWN',
    // 500
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CACHE_ERROR: 'CACHE_ERROR',
    EMAIL_ERROR: 'EMAIL_ERROR',
};
//# sourceMappingURL=index.js.map