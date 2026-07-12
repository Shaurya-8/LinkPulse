import { Request, Response, NextFunction } from "express";
import { UserStatus } from "../../generated/prisma/enums";
// ──────────────────────────────────────────────────────────────────────────
//  PRIMITIVE ALIASES
//  Branded types make IDs and tokens nominally typed so they can't be
//  accidentally swapped (e.g., passing a sessionId where a userId is expected).
// ──────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { readonly [__brand]: TBrand };


export type UserId = Brand<string, "UserId">;
export type SessionId = Brand<string, "SessionId">;
export type DeviceId = Brand<string, "DeviceId">;
export type OtpId = Brand<string, "OtpId">;
export type Jti = Brand<string, 'Jti'>;
export type AccessToken = Brand<string, "AccessToken">;
export type RefreshToken = Brand<string, "RefreshToken">;
export type TokenHash = Brand<string, "TokenHash">;
export type DeviceFingerprint = Brand<string, "DeviceFingerprint">;

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// Generic helpers used throughout the codebase.
// ═════════════════════════════════════════════════════════════════════════════

/** Make specific keys of T optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific keys of T required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Recursively make all properties readonly */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/** Recursively make all properties non-nullable */
export type NonNullableDeep<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/** Extract the resolved type from a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** A value that is either T or a Promise<T> */
export type MaybePromise<T> = T | Promise<T>;

/** Node.js environment strings */
export type NodeEnv = 'development' | 'production' | 'test';

/** Express middleware signature */
export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

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
} as const;

export type CacheNamespace = typeof CacheNamespace[keyof typeof CacheNamespace];




/** job */
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. ENUMS
//    Mirrors the Prisma schema enums. Defined here so the rest of the app can
//    use them without importing @prisma/client everywhere.
// ═════════════════════════════════════════════════════════════════════════════

/** Lifecycle state of a user account */

/** Physical device category inferred from the User-Agent string */
export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  UNKNOWN = 'UNKNOWN',
}

/** What the OTP was requested for — determines validity rules and email copy */
export enum OtpPurpose {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET"
}

/** Every auditable action in the system — kept in sync with schema.prisma */
export enum AuditAction {
  REGISTER = 'REGISTER',
  OTP_SENT = 'OTP_SENT',
  OTP_RESEND = 'OTP_RESEND',
  OTP_VERIFY_SUCCESS = 'OTP_VERIFY_SUCCESS',
  OTP_VERIFY_FAIL = 'OTP_VERIFY_FAIL',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAIL = 'LOGIN_FAIL',
  LOGOUT = 'LOGOUT',
  LOGOUT_ALL = 'LOGOUT_ALL',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  DEVICE_TRUSTED = 'DEVICE_TRUSTED',
  DEVICE_REMOVED = 'DEVICE_REMOVED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. DEVICE TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Parsed and derived device metadata attached to every incoming request
 * by deviceInfoMiddleware. Passed through to service layer for logging
 * and device upsert.
 */

export interface DeviceInfo {
  /** SHA-256 of ua + os + osVersion + cpu + deviceType + accept-language */
  deviceFingerprint: DeviceFingerprint;
  /** Human-readable label, e.g. "Chrome 120 on Windows 11" */
  deviceName: string;
  deviceType: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  cpu: string | null;
  /** Raw User-Agent header value */
  userAgent: string;
  /** Client IP, extracted from proxy headers */
  ipAddress: string;
}

/**
 * Safe device shape returned to the HTTP client — omits the full User-Agent
 * and raw fingerprint (fingerprint is shown for "this device" matching only).
 */
export interface DeviceView {
  id: DeviceId;
  fingerprint: DeviceFingerprint;
  deviceName: string | null;
  deviceType: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  cpu: string | null;
  isTrusted: boolean;
  loginCount: number;
  activeSessions: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** True when this device matches the fingerprint of the current request */
  isCurrent: boolean;
}


// ═════════════════════════════════════════════════════════════════════════════
// 4. JWT / TOKEN TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Claims encoded inside the access token (short-lived, 15m default).
 * The `jti` is stored in Redis's blocklist when the token is revoked.
 */
export interface JwtAccessPayload {
  /** Subject — userId */
  sub: UserId;
  email: string;
  /** JWT ID — unique per token; used for revocation without DB lookup */
  jti: Jti;
  sessionId: SessionId;
  /** Issued at (Unix timestamp, seconds) — added by jsonwebtoken */
  iat?: number;
  /** Expires at (Unix timestamp, seconds) — added by jsonwebtoken */
  exp?: number;
}

/**
 * Claims encoded inside the refresh token (long-lived, 7d default).
 * Intentionally minimal — the real session data is in Postgres.
 */
export interface JwtRefreshPayload {
  /** Subject — userId */
  sub: UserId;
  email: string;
  sessionId: SessionId;
  iat?: number;
  exp?: number;
}

/** The pair returned to the client on login / verify-otp / refresh */
export interface TokenPair {
  accessToken: AccessToken;
  refreshToken: RefreshToken;
  /** Access token lifetime in seconds — lets the client set a refresh timer */
  expiresIn: number;
  /** Always "Bearer" — included so clients don't have to hard-code it */
  tokenType: 'Bearer';
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. HTTP REQUEST TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Augmented express Request for routes protected by the authenticate middleware.
 * After authenticate runs, `user` is guaranteed to be populated.
 */
export interface AuthenticatedRequest extends Request {
  /** Populated by authenticate middleware — undefined on public routes */
  user: {
    id: UserId;
    email: string;
    refreshToken: RefreshToken;
    sessionId: SessionId;
  };
}

/**
 * Augmented express Request for public routes (no user, but device is present).
 */
export interface PublicRequest extends Request {
  deviceInfo?: DeviceInfo;
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. API RESPONSE SHAPES
// ═════════════════════════════════════════════════════════════════════════════

/** Single field-level validation error, returned inside ApiResponse.errors */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Standard JSON envelope for every HTTP response in the system.
 *
 * Success shape:
 *   { success: true, message: "...", data: {...} }
 *
 * Error shape:
 *   { success: false, message: "...", meta: { code: "VALIDATION_ERROR" }, errors: [...] }
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: ApiResponseMeta;
}

export interface ApiResponseMeta {
  /** Machine-readable error code, e.g. "RATE_LIMIT_EXCEEDED" */
  code?: string;
  /** Pagination info for list endpoints */
  pagination?: PaginationMeta;
  /** Seconds until rate limit resets */
  retryAfter?: number | string;
  [key: string]: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. REQUEST DTOs
//    These are the validated body shapes for each endpoint.
//    express-validator ensures the request.body conforms before the controller
//    reads these fields.
// ═════════════════════════════════════════════════════════════════════════════

/** POST /auth/register */
export interface RegisterDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
}

/** POST /auth/verify-otp */
export interface VerifyOtpDto {
  email: string;
  /** Exactly 6 numeric digits */
  otp: string;
}

/** POST /auth/resend-otp */
export interface ResendOtpDto {
  email: string;
}

/** POST /auth/login */
export interface LoginDto {
  email: string;
  password: string;
}

/** POST /auth/refresh */
export interface RefreshTokenDto {
  refreshToken: RefreshToken;
}

/** POST /auth/logout (body is empty — token comes from Authorization header) */
export type LogoutDto = Record<never, never>;

/** DELETE /auth/sessions/:sessionId */
export interface RevokeSessionDto {
  sessionId: SessionId;
}

export interface OtpSession<T = unknown> {
  purpose: OtpPurpose;
  recipient: string;
  channel: "email" | "sms";
  verificationId: string;
  metadata: T;
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. SERVICE RESULT TYPES
//    What each service method returns to the controller layer.
//    All business logic in the service returns one of these shapes.
// ═════════════════════════════════════════════════════════════════════════════

/** Returned by authService.register() */
export interface RegisterResult {
  verificationId: string
  purpose: OtpPurpose,
  requestId: string
}

/** Returned by authService.resendOtp() */
export interface ResendOtpResult {
  verificationId: string,
  purpose: OtpPurpose,
  requestId: string
}

/** Returned by authService.verifyEmailOtp() */
export interface OtpVerifyResult<T = unknown> {
  data: T;
  tokens?: TokenPair;
  sessionId?: string;
  device?: DeviceInfo,
}
/** Returned by authService.verifyEmailOtp() */


/** Returned by authService.login() */
export interface LoginResult {
  data: {
    user: AuthUserView;
  }
  tokens: TokenPair;
  device?: DeviceInfo;
  sessionId: SessionId;
}

/** Returned by authService.refreshTokens() */
export type RefreshResult = TokenPair;

/** Returned by authService.getActiveSessions() */
export interface SessionView {
  id: SessionId;
  userId: UserId;
  deviceId: DeviceId | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  /** Joined device info — null if device was removed */
  device: SessionDeviceView | null;
  /** True when this session matches the authenticated request's sessionId */
  isCurrent?: boolean;
}

/** Minimal device shape embedded inside SessionView */
export interface SessionDeviceView {
  id: DeviceId;
  deviceName: string | null;
  deviceType: DeviceType;
  os: string | null;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  isTrusted: boolean;
  loginCount: number;
  lastSeenAt: Date;
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. ENTITY VIEW TYPES
//    Safe DB row shapes returned in HTTP responses.
//    These NEVER include passwordHash, otpHash, twoFactorSecret, or raw tokens.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * User profile shape returned by GET /auth/me and embedded in login/verify responses.
 * Every sensitive field (passwordHash, twoFactorSecret) is deliberately excluded.
 */
export interface AuthUserView {
  id: UserId;
  email: string;
  name: string;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}


/** Extended profile returned by GET /auth/me — includes aggregate stats */
export interface MeResponse {
  user: AuthUserView & {
    stats: {
      activeSessions: number;
      knownDevices: number;
    };
  };
  currentDevice: Omit<DeviceInfo, 'userAgent'>;  // omit raw UA from client responses
  session: {
    id: SessionId;
    jti: Jti;
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. AUDIT TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Options passed to the internal audit() helper in auth.service.ts.
 * Keeps audit call sites concise while enforcing a consistent shape.
 */
export interface AuditOptions {
  userId?: UserId;
  sessionId?: SessionId;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  metadata?: AuditMetadata;
  success?: boolean;
  errorCode?: string;
  errorMsg?: string;
  durationMs?: number;
}

/**
 * Typed metadata payloads for each audit action.
 * Using a union keeps the JSONB `metadata` column queryable.
 */
export type AuditMetadata =
  | RegisterAuditMeta
  | LoginAuditMeta
  | OtpAuditMeta
  | LogoutAuditMeta
  | TokenAuditMeta
  | DeviceAuditMeta
  | Record<string, unknown>; // escape hatch for future actions

export interface RegisterAuditMeta {
  email: string;
}

export interface LoginAuditMeta {
  email: string;
  deviceFingerprint: DeviceFingerprint;
  deviceType: DeviceType;
  isNewDevice?: boolean;
}

export interface OtpAuditMeta {
  email: string;
  purpose: OtpPurpose;
  attemptsLeft?: number;
}

export interface LogoutAuditMeta {
  sessionsRevoked?: number;
  reason?: string;
}

export interface TokenAuditMeta {
  previousJti?: Jti;
  newJti?: Jti;
}

export interface DeviceAuditMeta {
  deviceId: DeviceId;
  deviceName: string | null;
  deviceType: DeviceType;
}



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
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];





// ═════════════════════════════════════════════════════════════════════════════
// 13. UTILITY TYPES
//    Generic helpers used throughout the codebase.
// ═════════════════════════════════════════════════════════════════════════════

/** Pagination query params parsed from the request */
export interface PaginationQuery {
  page: number;
  limit: number;
}

/** Standard list result returned by any service method that paginates */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}
