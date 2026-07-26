import { Request, Response, NextFunction } from "express";
import { extractAccessToken } from "../common/utils/cookies";
import { UnauthorizedError } from "../common/errors/AppError";
import { config } from "../config";
import { verifyToken } from "../common/utils/jwt";
import { AuthenticatedRequest } from "../types";
import { RefreshToken, SessionId, UserId } from "../types";
import { JwtAccessPayload } from "../types";
import { cache, cacheKeys } from "../config/redis";
import { SessionsRepository } from "../modules/auth/session/session.repository";
import { prisma } from "../config/prisma";
import { logger } from "../common/utils/logger";

const sessionRepository = new SessionsRepository(prisma);

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const rawToken = extractAccessToken(req as any);
        console.log("rawToken: ", rawToken)
        if (!rawToken) {
            throw new UnauthorizedError('Authentication required, please login.');
        }

        const payload = verifyToken<JwtAccessPayload>(rawToken, config.jwt.accessSecret, 'api');
        console.log("payload: ", payload)
        
        const isRevoked = await cache.exists(cacheKeys.revokedAccessToken(payload.jti));
        console.log("isRevoked: ", isRevoked)
        if (isRevoked) {
            throw new UnauthorizedError('Token has been revoked. Please login again.');
        }
        
        const session = await sessionRepository.getByAccessJti(payload.jti);
        console.log("session: ",session);
        if (!session || !session.isActive) {
            throw new UnauthorizedError('Session is inactive or does not exist. Please login again.');
        }
        
        sessionRepository.updateLastUsed(session.id)
        .catch(err => {
            logger.warn('Failed to update session last used timestamp:', err);
        });
        
        (req as AuthenticatedRequest).user = {
            sub: payload.sub as UserId,
            email: payload.email,
            refreshToken: session.refreshToken as RefreshToken,
            sessionId: session.id as SessionId,
            role: payload.role
        };
        
        next();
    } catch (err) {
        next(err);

    }
}

export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
    const rawToken = extractAccessToken(req as any);
    console.log("From middleware: ", req.url);
    if (!rawToken) {
        return next();
    }
    try {
        await authenticate(req, res, next);
    } catch (err) {
        next(err);
    }
}