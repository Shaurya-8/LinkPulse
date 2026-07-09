import { v4 as uuid4 } from "uuid";

import { UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../config/prisma";

import { config } from "../../config";
import { cache, cacheKeys } from "../../config/redis"

import {
    RefreshToken,
    JwtRefreshPayload,
    SessionId,
    UserId,
    DeviceInfo,
    OtpVerifyResult,
    OtpSession,
    AccessToken,
    JwtAccessPayload
} from "../../types";
import { LoginResult, OtpPurpose, RegisterResult } from "../../types";
import { RegisterDto, LoginDto, DeleteDto } from "./auth.schema";

import { logger } from "../../common/utils/logger";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../common/errors/AppError"
import { generateTokenPair, verifyToken } from "../../common/utils/jwt"
import type { AuthUser } from "./auth.repository";
import {
    hashPassword,
    verifyPassword,
    generateSecureToken,
    hashToken,
} from "../../common/utils/crypto";

import { UserRepository } from "./auth.repository"

import * as otpService from "../otp/otp.service";
import * as sessionService from "./session/session.service"
import { upsertDevice } from "../device/device.service"

import { otpTemplateFactory } from "../email/email.template";

import { enqueueEmail } from "../../jobs/queues";
import { email } from "zod";
const db = new UserRepository(prisma);

export async function sendVerificationEmail(email: string): Promise<string> {
    const verificationId = generateSecureToken(8);
    const otpResult = await otpService.create(verificationId);
    const template = otpTemplateFactory({
        otp: otpResult.otp,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresIn: config.otp.expiresMinutes
    }
    );

    await enqueueEmail({ to: email, ...template, });
    return verificationId;
}




async function activeSession(user: AuthUser, device: DeviceInfo) {
    const sessionId = uuid4() as SessionId
    const tokens = generateTokenPair(user.id as UserId, user.email, sessionId);

    /**
     * create userDevice or update if already exist
     */

    const deviceId = await upsertDevice(user.id, device)

    const jti = JSON.parse(
        Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString()
    ).jti;

    await sessionService.create(user.id as UserId, deviceId, tokens, device, jti, sessionId);
    logger.info('Session created', { userId: user.id });

    void cache.set(cacheKeys.userById(user.id as UserId), user, parseInt(config.jwt.refreshExpires, 10) * 24 * 60 * 60);

    return {
        data: {
            user: {
                id: user.id as UserId,
                email: user.email,
                name: user.firstName + " " + (user.lastName ?? ""),
                status: user.status,
                emailVerified: user.emailVerified,
            },
            accessToken: tokens.accessToken
        },
        tokens,
        sessionId
    }
}

export async function register(dto: RegisterDto): Promise<RegisterResult> {
    const { email, firstName, lastName, password } = dto;

    const exist = await db.getByEmail(dto.email);

    /** 
     * check if user already exist or blocked
     */
    if (exist) {
        if (exist.emailVerified) throw new BadRequestError("An account with this email already exists.");

        if (exist.status === UserStatus.BLOCKED) {
            throw new BadRequestError("Unable to register. Please contact support.");
        }
        if (exist.status === UserStatus.DELETED) {
            throw new BadRequestError("Unable to register. Please contact support.");
        }
    }

    /**
     * create OTP and send Email to Email Id with firstName and otp 
    */
    const verificationId = await sendVerificationEmail(dto.email);
    const passwordHash = await hashPassword(password);
    if (exist && (!exist.emailVerified || exist.status === UserStatus.PENDING)) {
        await db.updatePassword(email, passwordHash);
    } else {
        await db.createUser({ email, firstName, lastName, passwordHash, });
    }

    /**
     * Store user in redis for 20 min to verify user email
    */
    const requestId = generateSecureToken(8);
    void cache.set(cacheKeys.otpSessionData(requestId), {
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        recipient: dto.email,
        channel: "email",
        verificationId,
        metadata: {
            email: dto.email
        }

    } as OtpSession<{ email: string }>, 20 * 60);
    // requestId: string;
    //   purpose: OtpPurpose;
    //   recipient: string;
    //   channel: "email" | "sms";
    //   verificationId: string;
    //   expiresAt: number;
    return {
        requestId,
        verificationId,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
    }
}

export async function verifyEmail(requestId: string, device: DeviceInfo): Promise<OtpVerifyResult> {

    const otpSessionData = await cache.get<OtpSession<{ email: string }>>(cacheKeys.otpSessionData(requestId))

    if (!otpSessionData || !otpSessionData.recipient) throw new BadRequestError("Verification session expired. Please register again."); //throw error if timeout

    const user = await db.verifyEmail(otpSessionData.recipient);

    void cache.del(cacheKeys.otpSessionData(requestId));

    return activeSession({
        ...user,
        id: user.id as UserId,
    }, device);
}



export async function login(dto: LoginDto, device: DeviceInfo): Promise<LoginResult> {
    const user = await db.getByEmail(dto.email);

    if (!user) throw new NotFoundError('user');

    if (user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.DELETED ||
        user.status === UserStatus.PENDING ||
        !user.emailVerified
    ) throw new BadRequestError("Invalid UserId or Password");

    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);

    if (!isPasswordValid) {
        throw new BadRequestError("Incorrect password");
    }

    return activeSession({
        ...user,
        id: user.id as UserId,
    }, device);
}

interface resetPasswordOtpSesssion {
    userId: UserId,
    passwordHash: string
}

interface ResetPasswordRequestResult {
    verificationId: string,
    requestId: string,
    purpose: OtpPurpose
}

export async function resetPasswordRequest(dto: { password: string }, token: AccessToken, device?: DeviceInfo): Promise<ResetPasswordRequestResult> {
    const user = verifyToken<JwtAccessPayload>(token, config.jwt.accessSecret, 'api');
    const requestId = generateSecureToken(8);
    const passwordHash = hashPassword(dto.password);

    const verificationId = generateSecureToken(8);
    const { otp, otpExpiresAt } = await otpService.create(verificationId);
    await cache.set(
        cacheKeys.otpSessionData(requestId), {
            purpose: OtpPurpose.PASSWORD_RESET,
            channel: 'email',
            verificationId,
            recipient: user.email,
            metadata: { passwordHash, userId: user.sub as UserId }
        } as unknown as OtpSession<resetPasswordOtpSesssion>);

    await cache.set(cacheKeys.otpVerify(verificationId), otp, otpExpiresAt);

    const template = otpTemplateFactory({ otp, purpose: OtpPurpose.PASSWORD_RESET, expiresIn: otpExpiresAt })
    await enqueueEmail({ to: user.email, ...template });
    return {
        verificationId,
        requestId,
        purpose: OtpPurpose.PASSWORD_RESET
    }
}

export async function resetPassword(requestId: string, device: DeviceInfo) {
    const cached = await cache.get<OtpSession<Record<keyof resetPasswordOtpSesssion, string>>>(cacheKeys.otpSessionData(requestId));
    if (!cached) throw new BadRequestError("Reset session expire");

    const user = await db.updatePassword(cached.recipient, cached.metadata.passwordHash);

    void cache.del(cacheKeys.otpSessionData(requestId));
    await logoutAll(user.id as UserId);
    return activeSession({
        ...user,
        id: user.id as UserId,
    }, device);
}

export async function logout(
    userId: UserId,
    refreshToken: RefreshToken,
    device: DeviceInfo
): Promise<void> {
    // Revoke session in DB
    const revokedSession = await sessionService.revoke(refreshToken);
    await cache.srem(cacheKeys.userSessions(userId));
    // Blocklist the access JTI in Redis (until access token expires ~15m)
    await cache.set(cacheKeys.revokedAccessToken(revokedSession.accessJti), '1', 15 * 60);

    logger.info('User logged out', { userId, jti: revokedSession.accessJti });
}

/**
 * 
 * @param userId 
 * revoke all activeSession and return these's Jti
 * block all JTIs 
 * 
 */
export async function logoutAll(userId: UserId): Promise<void> {

    /**
     * activeSession store all the id $ accessJti of active sessions
     */
    const activeSessions = await sessionService.revokeAllActive(userId);

    void cache.srem(cacheKeys.userSessions(userId));
    // Blocklist all JTIs
    await Promise.all(
        activeSessions.map((s) =>
            cache.set(cacheKeys.revokedAccessToken(s.accessJti), '1', 15 * 60)
        )
    );

    logger.info('User logged out from all devices', { userId, count: activeSessions.length });
}

export async function refreshToken(refreshToken: RefreshToken, device: DeviceInfo) {
    /**
     * payload: JwtRefershPayload = {sub: userId,....}
     */
    const { sub, email, sessionId } = verifyToken<JwtRefreshPayload>(refreshToken, config.jwt.refreshSecret, 'refresh');
    const oldTokenHash = hashToken(refreshToken);
    await sessionService.getOrRevokeUser(sub, oldTokenHash);

    const tokens = generateTokenPair(sub, email, sessionId);
    const tokenHash = hashToken(tokens.refreshToken);

    const jti = JSON.parse(
        Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString()).jti

    const user = await sessionService.updateRefreshtoken(sessionId, tokenHash, jti);
    // Audit device

    return {
        user,
        tokens,
        sessionId
    }
}

export async function deleteUser(dto: DeleteDto): Promise<string> {
    const user = await db.getByEmail(dto.email);

    if (!user) throw new NotFoundError("user not found");

    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash)
    if (!isPasswordValid) {
        throw new BadRequestError("Incorrect Password");
    }

    const allActiveSessions = await prisma.$transaction(async (tx) => {
        const activeSessions = await tx.session.findMany({
            where: { userId: user.id, isActive: true },
            select: { id: true, accessJti: true }
        });

        await tx.user.update({
            where: { id: user.id },
            data: {
                status: UserStatus.DELETED
            }
        })
        await tx.session.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false, revokedAt: new Date() }
        });

        return activeSessions;
    });

    void cache.srem(cacheKeys.userSessions(user.id as UserId));

    await Promise.all(
        allActiveSessions.map((s) =>
            cache.set(cacheKeys.revokedAccessToken(s.accessJti), '1', 15 * 60)
        )
    );

    logger.info("User Deleted successfully", { userId: user.id });
    return 'User Delete Successfully'
}


