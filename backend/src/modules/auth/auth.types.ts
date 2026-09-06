// import type { Request } from "express";
// import { UserId, Jti, SessionId, DeviceId } from "../../types";
// import { DeviceInfo, DeviceType } from "../../types";
// import { AccessToken, RefreshToken } from "../../types";
// import { Prisma, UserStatus } from "../../../generated/prisma/client";


// // ────────────────────────────────────────────────────────────────────────────
// /**
//  * HTTP REQUEST TYPES
//  * Augmented express Request for routes protected by the authenticate middleware.
//  * After authenticate runs, `user` is guaranteed to be populated.
//  */// ───────────────────────────────────────────────────────────────────────────
// export interface AuthenticatedRequest extends Request {
//     /** Populated by authenticate middleware — undefined on public routes */
//     user: {
//         id: UserId;
//         email: string;
//         refreshToken: RefreshToken;
//         sessionId: SessionId;
//     };
//     deviceInfo?: DeviceInfo;
// }

// /**
//  * Augmented express Request for public routes (no user, but device is present).
//  */
// export interface PublicRequest extends Request {
//     deviceInfo?: DeviceInfo;
// }

// // ────────────────────────────────────────────────────────────────────────────
// // API RESPONSE SHAPES
// // ────────────────────────────────────────────────────────────────────────────





// // ─────────────────────────────────────────────────────────────────────────────
// //    REQUEST DTOs
// //    These are the validated body shapes for each endpoint.
// //    express-validator ensures the request.body conforms before the controller
// //    reads these fields.
// // ────────────────────────────────────────────────────────────────────────────

// /** POST /auth/register */
// export interface RegisterDto {
//     email: string;
//     passwordHash: string;
//     firstName: string;
//     lastName?: string;

// }

// /** POST /auth/verify-otp */
// export interface VerifyOtpDto {
//     email: string;
//     /** Exactly 6 numeric digits */
//     otp: string;
// }

// /** POST /auth/resend-otp */
// export interface ResendOtpDto {
//     email: string;
// }

// /** POST /auth/login */
// export interface LoginDto {
//     email: string;
//     password: string;
// }

// /** POST /auth/refresh */
// export interface RefreshTokenDto {
//     refreshToken: RefreshToken;
//     accessJti: Jti
// }

// /** POST /auth/logout (body is empty — token comes from Authorization header) */
// export type LogoutDto = Record<never, never>;

// /** DELETE /auth/sessions/:sessionId */
// export interface RevokeSessionDto {
//     sessionId: SessionId;
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // 8. USER SERVICE RESULT TYPES
// //    What each service method returns to the controller layer.
// //    All business logic in the service returns one of these shapes.
// // ═════════════════════════════════════════════════════════════════════════════

// /**  Lifecycle state of a user account */
// // export enum UserStatus {
// //     PENDING = "PENDING",
// //     ACTIVE = "ACTIVE",
// // }

// /** What the OTP was requested for ─ determine validity rules and email copy */
// export enum OtpPurpose {
//     EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
//     PASSWORD_RESET = "PASSWORD_RESET"
// }

// /** OtpDto */
// export interface OtpDto {
//     email: string,
//     userId: string,
//     purpose: OtpPurpose
// }

// /** Returned by authService.register() */
// export interface RegisterResult {
//     verificationId: string
//     purpose: OtpPurpose,
//     requestId: string
// }

// /** Returned by authService.resendOtp() */
// export interface ResendOtpResult {
//     otpExpiresAt: Date;
// }

// /** Returned by authService.verifyEmailOtp() */
// export interface OtpVerifyResult {
//     user: AuthUserView,
//     tokens: TokenPair,
//     device?: DeviceInfo,
//     sessionId: SessionId
// }

// export interface VerifyEmail {
//     user: AuthUserView,
//     tokens: TokenPair,
//     device?: DeviceInfo,
//     sessionId: SessionId
// }

// /** Returned by authService.login() */
// export interface LoginResult {
//     user: AuthUserView;
//     tokens: TokenPair;
//     device?: DeviceInfo;
//     sessionId: SessionId;
// }

// /** Returned by authService.refreshTokens() */
// export type RefreshResult = TokenPair;

// /** Returned by authService.getActiveSessions() */
// export interface SessionView {
//     id: SessionId;
//     userId: UserId;
//     deviceId: DeviceId | null;
//     ipAddress: string | null;
//     country: string | null;
//     city: string | null;
//     isActive: boolean;
//     lastUsedAt: Date;
//     createdAt: Date;
//     expiresAt: Date;
//     revokedAt: Date | null;
//     revokeReason: string | null;
//     /** Joined device info — null if device was removed */
//     device: SessionDeviceView | null;
//     /** True when this session matches the authenticated request's sessionId */
//     isCurrent?: boolean;
// }

// /** Minimal device shape embedded inside SessionView */
// export interface SessionDeviceView {
//     id: DeviceId;
//     deviceName: string | null;
//     deviceType: DeviceType;
//     os: string | null;
//     osVersion: string | null;
//     browser: string | null;
//     browserVersion: string | null;
//     isTrusted: boolean;
//     loginCount: number;
//     lastSeenAt: Date;
// }


// // ═════════════════════════════════════════════════════════════════════════════
// // ENTITY VIEW TYPES
// // Safe DB row shapes returned in HTTP responses.
// // These NEVER include passwordHash, otpHash, twoFactorSecret, or raw tokens.
// // ═════════════════════════════════════════════════════════════════════════════

// /**
//  * User profile shape returned by GET /auth/me and embedded in login/verify responses.
//  * Every sensitive field (passwordHash) is deliberately excluded.
//  */
// export interface AuthUserView {
//     id: UserId;
//     email: string;
//     name: string;
//     status: UserStatus;
//     emailVerified: boolean;
//     lastLoginAt?: Date | null;
//     createdAt?: Date;
//     updatedAt?: Date;
// }

// /** Extended profile returned by GET /auth/me — includes aggregate stats */
// export interface MeResponse {
//     user: AuthUserView & {
//         stats: {
//             activeSessions: number;
//             knownDevices: number;
//         };
//     };
//     currentDevice: Omit<DeviceInfo, 'userAgent'>;  // omit raw UA from client responses
//     session: {
//         id: SessionId;
//         jti: Jti;
//     };
// }
// /**
//  * Claims encoded inside the access token (short-lived, 15m default).
//  * The `jti` is stored in Redis's blocklist when the token is revoked.
//  */
// export interface JwtAccessPayload {
//     sub: UserId;
//     email: string;
//     jti: Jti;
//     sessionId: SessionId;
//     iat?: number;
//     exp?: number;
// }

// /**
//  * Claims encoded inside the refresh token (long-lived, 7d default).
//  * Intentionally minimal — the real session data is in Postgres.
//  */

// export interface JwtRefreshPayload {
//     sub: UserId;
//     sessionId: SessionId;
//     iat?: number;
//     exp?: number;
// }

// /** The pair returned to the client on login / verify-otp / refresh */
// export interface TokenPair {
//     accessToken: AccessToken;
//     refreshToken: RefreshToken;
//     expiresIn: number;
//     tokenType: 'Bearer';
// }
// // loginResult, OtpPurpose, RefreshTokenDto, RegisterResult 