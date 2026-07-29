import { config } from "../../../config";
import { prisma } from "../../../config/prisma";
import { cache, cacheKeys } from "../../../config/redis";
import { hashToken } from "../../../common/utils/crypto";
import { SessionsRepository } from "./session.repository";
import { UnauthorizedError } from "../../../common/errors/AppError";
const sessionRepository = new SessionsRepository(prisma);
export async function create(userId, deviceId, tokens, device, jti, sessionId, tx) {
    const count = await sessionRepository.countActive(userId);
    if (count >= config.session.maxPerUser) {
        const oldest = await sessionRepository.getOldestActive(userId, tx);
        if (oldest) {
            await sessionRepository.revokeByAccessJti(oldest.accessJti);
            await cache.del(cacheKeys.revokedAccessToken(oldest.accessJti));
        }
    }
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + (parseInt(config.jwt.refreshExpires, 10) * 24 * 60 * 60 * 1000));
    const session = await sessionRepository.create({
        id: sessionId,
        user: { connect: { id: userId } },
        ...(deviceId ? { device: { connect: { id: deviceId } } } : {}),
        refreshToken: refreshTokenHash,
        accessJti: jti,
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
        expiresAt,
        lastUsedAt: new Date(),
    }, tx);
    await cache.sadd(cacheKeys.userSessions(userId), session.id);
    return session.id;
}
export async function revoke(refreshToken) {
    // Revoke session in DB
    return await sessionRepository.revoke(refreshToken);
}
export async function revokeAllActive(userId, tx) {
    const activeSessions = await sessionRepository.getAllActive(userId, tx);
    await sessionRepository.revokeAllActive(userId, tx);
    return activeSessions;
}
export async function getOrRevokeUser(sub, refreshToken, tx) {
    const session = await sessionRepository.getWithUser(refreshToken, tx);
    if (!session) {
        throw new UnauthorizedError("invalid or expired Token");
    }
    if (session.expiresAt < new Date()) {
        await sessionRepository.revoke(refreshToken, tx);
        throw new UnauthorizedError('Session Expired, Please Login again');
    }
    return session.user;
}
export async function updateRefreshtoken(id, refreshToken, jti, tx) {
    const session = await sessionRepository.updateRefershToken(id, refreshToken, jti, tx);
    return session.user;
}
//# sourceMappingURL=session.service.js.map