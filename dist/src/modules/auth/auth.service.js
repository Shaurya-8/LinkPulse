import { v4 as uuid4 } from "uuid";
import { BillingPeriod, PlanType, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../config/prisma";
import { config } from "../../config";
import { cache, cacheKeys } from "../../config/redis";
import { OtpPurpose } from "../../types";
import { logger } from "../../common/utils/logger";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError";
import { generateTokenPair, verifyToken } from "../../common/utils/jwt";
import { hashPassword, verifyPassword, generateSecureToken, hashToken, } from "../../common/utils/crypto";
import { UserRepository } from "./auth.repository";
import * as otpService from "../otp/otp.service";
import * as sessionService from "./session/session.service";
import { upsertDevice } from "../device/device.service";
import { otpTemplateFactory } from "../email/email.template";
import { enqueueEmail } from "../../jobs/queues";
import { SubscriptionService } from "../subscription/subscription.service";
const db = new UserRepository(prisma);
export async function sendVerificationEmail(email) {
    const verificationId = generateSecureToken(8);
    const otpResult = await otpService.create(verificationId);
    const template = otpTemplateFactory({
        otp: otpResult.otp,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        expiresIn: config.otp.expiresMinutes
    });
    await enqueueEmail({ to: email, ...template, });
    return verificationId;
}
async function activeSession(user, device, tx) {
    const sessionId = uuid4();
    const tokens = generateTokenPair(user.id, user.email, sessionId, user.role);
    const accesToken = tokens.accessToken;
    /**
     * create userDevice or update if already exist
     */
    const deviceId = await upsertDevice(user.id, device, tx);
    const jti = JSON.parse(Buffer.from(accesToken.split('.')[1], 'base64').toString()).jti;
    await sessionService.create(user.id, deviceId, tokens, device, jti, sessionId, tx);
    logger.info('Session created', { userId: user.id });
    void cache.set(cacheKeys.userById(user.id), user, parseInt(config.jwt.refreshExpires, 10) * 24 * 60 * 60);
    return {
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.firstName + " " + (user.lastName ?? ""),
                status: user.status,
                emailVerified: user.emailVerified,
            },
            accessToken: tokens.accessToken
        },
        tokens,
        sessionId
    };
}
export async function register(dto) {
    const { email, firstName, lastName, password } = dto;
    const exist = await db.findFirst({ where: { email: dto.email } });
    /**
     * check if user already exist or blocked
     */
    if (exist) {
        if (exist.emailVerified)
            throw new BadRequestError("An account with this email already exists.");
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
    }
    else {
        await db.create({
            data: { email, firstName, lastName, passwordHash, },
        });
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
    }, 20 * 60);
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
    };
}
export async function registerGuest(device) {
    return 'userId';
}
export async function verifyEmail(requestId, device) {
    const otpSessionData = await cache.get(cacheKeys.otpSessionData(requestId));
    if (!otpSessionData || !otpSessionData.recipient) {
        throw new BadRequestError("Verification session expired. Please register again."); //throw error if timeout
    }
    const subscriptionService = new SubscriptionService();
    const result = prisma.$transaction(async (tx) => {
        const user = await db.verifyEmail(otpSessionData.recipient, tx);
        await subscriptionService.buySubscription(user.id, PlanType.FREE, BillingPeriod.MONTHLY, tx);
        return await activeSession({
            ...user,
            id: user.id,
        }, device, tx);
    });
    void cache.del(cacheKeys.otpSessionData(requestId));
    return result;
}
export async function login(dto, device) {
    const user = await db.loginUser(dto.email);
    if (!user)
        throw new NotFoundError('user');
    if (user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.DELETED ||
        user.status === UserStatus.PENDING ||
        !user.emailVerified)
        throw new BadRequestError("Invalid UserId or Password");
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new BadRequestError("Incorrect password");
    }
    return prisma.$transaction(async (tx) => {
        return activeSession({
            ...user,
            id: user.id,
        }, device, tx);
    });
}
export async function resetPasswordRequest(dto, token, device) {
    const user = verifyToken(token, config.jwt.accessSecret, 'api');
    const requestId = generateSecureToken(8);
    const passwordHash = hashPassword(dto.password);
    const verificationId = generateSecureToken(8);
    const { otp, otpExpiresAt } = await otpService.create(verificationId);
    await cache.set(cacheKeys.otpSessionData(requestId), {
        purpose: OtpPurpose.PASSWORD_RESET,
        channel: 'email',
        verificationId,
        recipient: user.email,
        metadata: { passwordHash, userId: user.sub }
    });
    await cache.set(cacheKeys.otpVerify(verificationId), otp, otpExpiresAt);
    const template = otpTemplateFactory({ otp, purpose: OtpPurpose.PASSWORD_RESET, expiresIn: otpExpiresAt });
    await enqueueEmail({ to: user.email, ...template });
    return {
        verificationId,
        requestId,
        purpose: OtpPurpose.PASSWORD_RESET
    };
}
export async function resetPassword(requestId, device) {
    const cached = await cache.get(cacheKeys.otpSessionData(requestId));
    if (!cached)
        throw new BadRequestError("Reset session expire");
    const user = await db.updatePassword(cached.recipient, cached.metadata.passwordHash);
    void cache.del(cacheKeys.otpSessionData(requestId));
    await logoutAll(user.id);
    return activeSession({
        ...user,
        id: user.id,
    }, device);
}
export async function logout(userId, refreshToken, device) {
    // Revoke session in DB
    const revokedSession = await sessionService.revoke(refreshToken);
    console.log("revokedSession: ", revokedSession);
    await cache.srem(cacheKeys.userSessions(userId), revokedSession.id);
    // Blocklist the access JTI in Redis (until access token expires ~15m)
    await cache.set(cacheKeys.revokedAccessToken(revokedSession.accessJti), '1', 15 * 60);
    const isRevoked = await cache.exists(cacheKeys.revokedAccessToken(revokedSession.accessJti));
    console.log("revokedSession: ", isRevoked);
    logger.info('User logged out', { userId, jti: revokedSession.accessJti });
    return;
}
/**
 *
 * @param userId
 * revoke all activeSession and return these's Jti
 * block all JTIs
 *
 */
export async function logoutAll(userId) {
    /**
     * activeSession store all the id $ accessJti of active sessions
     */
    const activeSessions = await sessionService.revokeAllActive(userId);
    void cache.srem(cacheKeys.userSessions(userId));
    // Blocklist all JTIs
    await Promise.all(activeSessions.map((s) => cache.set(cacheKeys.revokedAccessToken(s.accessJti), '1', 15 * 60)));
    logger.info('User logged out from all devices', { userId, count: activeSessions.length });
}
export async function refreshToken(refreshToken, device) {
    /**
     * payload: JwtRefershPayload = {sub: userId,....}
     */
    const { sub, email, sessionId, role } = verifyToken(refreshToken, config.jwt.refreshSecret, 'refresh');
    const oldTokenHash = hashToken(refreshToken);
    await sessionService.getOrRevokeUser(sub, oldTokenHash);
    const tokens = generateTokenPair(sub, email, sessionId, role);
    const tokenHash = hashToken(tokens.refreshToken);
    const jti = JSON.parse(Buffer.from(tokens.accessToken.split('.')[1], 'base64').toString()).jti;
    const user = await sessionService.updateRefreshtoken(sessionId, tokenHash, jti);
    // Audit device
    return {
        user,
        tokens,
        sessionId
    };
}
export async function deleteUser(dto) {
    const user = await db.findFirst({ where: { email: dto.email } });
    if (!user)
        throw new NotFoundError("user not found");
    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new BadRequestError("Incorrect Password");
    }
    const allActiveSessions = await prisma.$transaction(async (tx) => {
        const activeSessions = await tx.sessions.findMany({
            where: { userId: user.id, isActive: true },
            select: { id: true, accessJti: true }
        });
        await tx.users.update({
            where: { id: user.id },
            data: {
                status: UserStatus.DELETED
            }
        });
        await tx.sessions.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false, revokedAt: new Date() }
        });
        return activeSessions;
    });
    void cache.srem(cacheKeys.userSessions(user.id));
    await Promise.all(allActiveSessions.map((s) => cache.set(cacheKeys.revokedAccessToken(s.accessJti), '1', 15 * 60)));
    logger.info("User Deleted successfully", { userId: user.id });
    return 'User Delete Successfully';
}
//# sourceMappingURL=auth.service.js.map