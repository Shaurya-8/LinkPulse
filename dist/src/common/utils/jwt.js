import jwt from "jsonwebtoken";
import { v4 as uuid4 } from "uuid";
import { config } from "../../config";
import { UnauthorizedError } from "../errors/AppError";
// function parseExpiresInToSeconds(expiresIn: string): number {
//     const match = expiresIn.match('/^(\d+)([smhd])$/');
//     if (!match) return 900;
//     const value = parseInt(match[1]!, 10);
//     const unit = match[2];
//     const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
//     return value * (multipliers[unit!] ?? 60);
// }
function parseExpiresInToSeconds(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match)
        return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };
    return value * multipliers[unit];
}
export function generateTokenPair(userId, email, sessionId, role) {
    const jti = uuid4();
    const accessPayload = {
        sub: userId,
        email,
        jti: jti,
        sessionId,
        role,
    };
    const refreshPayload = {
        sub: userId,
        email,
        sessionId,
        role
    };
    const accessToken = jwt.sign(accessPayload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpires,
        issuer: config.app.name,
        audience: 'api'
    });
    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpires,
        issuer: config.app.name,
        audience: 'refresh',
    });
    return {
        accessToken,
        refreshToken,
        expiresIn: parseExpiresInToSeconds(config.jwt.accessExpires),
        tokenType: 'Bearer'
    };
}
export function verifyToken(token, secretKey, type = 'api') {
    try {
        return jwt.verify(token, secretKey, {
            issuer: config.app.name,
            audience: type,
        });
    }
    catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token expired');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid token');
        }
        throw new UnauthorizedError('Token verification failed');
    }
}
export function decodeTokenUnsafe(token) {
    try {
        return jwt.decode(token);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map