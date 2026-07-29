import { client } from "../config/redis";
import { logger } from "../common/utils/logger";
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local maxRequests = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local current = redis.call("INCR", key)

if current == 1 then
    redis.call("EXPIRE", key, windowSeconds)
end

local ttl = redis.call("TTL", key)

local remaining = math.max(0, maxRequests - current)

if current > maxRequests then
    return {0, current, remaining, ttl}
end

return {1, current, remaining, ttl}
`;
export async function rateLimit(identifier, options) {
    const key = `${options.keyPrefix}:${identifier}`;
    const result = (await client.eval(RATE_LIMIT_LUA, 1, key, options.maxRequests, options.windowSeconds));
    const [allowed, current, remaining, resetInSeconds] = result;
    return {
        allowed: allowed === 1,
        current,
        remaining,
        resetInSeconds,
    };
}
function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
}
export function globalRateLimiter(options) {
    const config = {
        keyPrefix: "rate-limit:global",
        windowSeconds: 60,
        maxRequests: 100,
        ...options,
    };
    return async (req, res, next) => {
        try {
            const ip = getClientIp(req);
            const result = await rateLimit(ip, config);
            res.locals.rateLimit = result;
            res.setHeader("X-RateLimit-Limit", config.maxRequests);
            res.setHeader("X-RateLimit-Remaining", result.remaining);
            res.setHeader("X-RateLimit-Reset", result.resetInSeconds);
            if (!result.allowed) {
                return res.status(429).json({
                    error: "Too many requests",
                    retryAfterSeconds: result.resetInSeconds,
                });
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
function rateLimiter(config, error) {
    return async (req, res, next) => {
        try {
            const ip = getClientIp(req);
            const email = typeof req.body.email === "string" ? req.body.email.toLowerCase().trim() : "unknown";
            const identifier = `${ip}:${email}`;
            const result = await rateLimit(identifier, config);
            res.locals.rateLimit = result;
            res.setHeader("X-RateLimit-Limit", config.maxRequests);
            res.setHeader("X-RateLimit-Remaining", result.remaining);
            res.setHeader("X-RateLimit-Reset", result.resetInSeconds);
            if (!result.allowed) {
                return res.status(429).json({
                    error: "Too many requests",
                    retryAfterSeconds: result.resetInSeconds,
                });
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
export function loginRateLimiter(options) {
    const config = {
        keyPrefix: "rate-limit:login",
        windowSeconds: 15 * 60,
        maxRequests: 5,
        ...options,
    };
    return rateLimiter(config, "Too many login attempts");
}
export function otpRateLimiter(options) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:opt",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    };
    return rateLimiter(config, "Too many opt attempts");
}
export function registerRateLimiter(options) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:register",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    };
    return rateLimiter(config, "Too many register attempts");
}
export function passwordResetRateLimiter(options) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:password-reset",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    };
    return rateLimiter(config, "Too many password reset attempts");
}
export function progressiveDelay(opts = {}) {
    const { threshold = 3, baseDelay = 500, maxDelay = 5000, } = opts;
    return (req, res, next) => {
        const info = res.locals.rateLimit;
        const current = info?.current ?? 0;
        if (current <= threshold) {
            return next();
        }
        const exponent = current - threshold;
        const delay = Math.min(baseDelay * Math.pow(2, exponent - 1), maxDelay);
        logger.debug("Progressive delay applied", {
            ip: getClientIp(req),
            path: req.originalUrl,
            attempt: current,
            delayMs: delay,
        });
        setTimeout(() => next(), delay);
    };
}
//# sourceMappingURL=rate-limiter.middleware.js.map