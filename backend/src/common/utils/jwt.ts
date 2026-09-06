import jwt from "jsonwebtoken";
import { v4 as uuid4 } from "uuid";
import { config } from "../../config";
import { AccessToken, RefreshToken, JwtAccessPayload, JwtRefreshPayload, Jti, SessionId, TokenPair, UserId } from "../../types";
import { UnauthorizedError } from "../errors/AppError";
// import { UserRole, PlanType } from "../../generated/prisma/enums";
import { PlanType, UserRole } from "../../../generated/prisma/enums";

// function parseExpiresInToSeconds(expiresIn: string): number {
//     const match = expiresIn.match('/^(\d+)([smhd])$/');
//     if (!match) return 900;
//     const value = parseInt(match[1]!, 10);
//     const unit = match[2];
//     const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
//     return value * (multipliers[unit!] ?? 60);
// }

function parseExpiresInToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) return 900;

    const value = Number(match[1]);
    const unit = match[2] as "s" | "m" | "h" | "d";

    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };

    return value * multipliers[unit];
}

export function generateTokenPair(
    userId: UserId,
    email: string,
    sessionId: SessionId,
    role: UserRole,
    planType: PlanType
): TokenPair {
    const jti = uuid4();

    const accessPayload: JwtAccessPayload = {
        sub: userId,
        email,
        jti: jti as Jti,
        sessionId,
        role,
        planType,
    };

    const refreshPayload: JwtRefreshPayload = {
        sub: userId as UserId,
        email,
        sessionId,
        role,
        planType
    }

    const accessToken = jwt.sign(accessPayload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpires as jwt.SignOptions['expiresIn'],
        issuer: config.app.name,
        audience: 'api'
    }) as AccessToken;

    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
        issuer: config.app.name,
        audience: 'refresh',
    }) as RefreshToken;

    return {
        accessToken,
        refreshToken,
        expiresIn: parseExpiresInToSeconds(config.jwt.accessExpires),
        tokenType: 'Bearer'
    };
}

export function verifyToken<T = any>(token: string, secretKey: string, type: 'api' | 'refresh' | 'Bearer' = 'api'): T {
    try {
        return jwt.verify(token, secretKey, {
            issuer: config.app.name,
            audience: type,
        }) as T;

    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token expired');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid token');
        }
        throw new UnauthorizedError('Token verification failed');
    }
}

export function decodeTokenUnsafe(token: string): JwtAccessPayload | null {
    try {
        return jwt.decode(token) as JwtAccessPayload;
    } catch {
        return null;
    }
}