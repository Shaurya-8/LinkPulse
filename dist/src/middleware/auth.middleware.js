import { extractAccessToken } from "../common/utils/cookies";
import { UnauthorizedError } from "../common/errors/AppError";
import { config } from "../config";
import { verifyToken } from "../common/utils/jwt";
import { cache, cacheKeys } from "../config/redis";
import { SessionsRepository } from "../modules/auth/session/session.repository";
import { prisma } from "../config/prisma";
import { logger } from "../common/utils/logger";
const sessionRepository = new SessionsRepository(prisma);
export async function authenticate(req, res, next) {
    try {
        const rawToken = extractAccessToken(req);
        console.log("rawToken: ", rawToken);
        if (!rawToken) {
            throw new UnauthorizedError('Authentication required, please login.');
        }
        const payload = verifyToken(rawToken, config.jwt.accessSecret, 'api');
        console.log("payload: ", payload);
        const isRevoked = await cache.exists(cacheKeys.revokedAccessToken(payload.jti));
        console.log("isRevoked: ", isRevoked);
        if (isRevoked) {
            throw new UnauthorizedError('Token has been revoked. Please login again.');
        }
        const session = await sessionRepository.getByAccessJti(payload.jti);
        console.log("session: ", session);
        if (!session || !session.isActive) {
            throw new UnauthorizedError('Session is inactive or does not exist. Please login again.');
        }
        sessionRepository.updateLastUsed(session.id)
            .catch(err => {
            logger.warn('Failed to update session last used timestamp:', err);
        });
        req.user = {
            sub: payload.sub,
            email: payload.email,
            refreshToken: session.refreshToken,
            sessionId: session.id,
            role: payload.role
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
export async function optionalAuthenticate(req, res, next) {
    const rawToken = extractAccessToken(req);
    console.log("From middleware: ", req.url);
    if (!rawToken) {
        return next();
    }
    try {
        await authenticate(req, res, next);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.middleware.js.map