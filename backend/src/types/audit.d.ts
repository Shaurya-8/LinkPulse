import { UserId, DeviceFingerprint, DeviceId, Jti, SessionId } from ".";
import { OtpPurpose } from "../modules/auth/auth.types";
import { DeviceType } from "./device";

/** Every auditable action in the system ─ kept in sync with schema.prisma */
export enum AuditAction {
    REGISTER = "REGISTER",
    OTP_SENT = "OTP_SENT",
    OTP_RESEND = "OTP_RESEND",
    OTP_VERIFY_SUCCES = "OTP_VERIFY_SUCCES",
    OTP_VERIFY_FAIL = "OTP_VERIFY_FAIL",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAIL = "LOGIN_FAIL",
    LOGOUT = "LOGOUT",
    LOG_ALL = "LOG_ALL",
    TOKEN_REVOKED = "TOKEN_REVOKED",
    EMAIL_VERIFIED = "EMAIL_VERIFIED",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
    PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS",
    ACCOUT_SUSPENDED = "ACCOUT_SUSPENDED",
    ACCOUNT_DELETED = "ACCOUNT_DELETED",
    DEVICE_TRUSTED = "DEVICE_TRUSTED",
    DEVICE_REMOVED = "DEVICE_REMOVED",
    SESSION_EXPRIRED = "SESSION_EXPRIRED",
    RATE_LIMIT_HIT = "RATE_LIMIT_HIT",
}


// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT TYPES
// ─────────────────────────────────────────────────────────────────────────────
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
