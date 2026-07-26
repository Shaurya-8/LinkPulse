// rateLimiter.ts
import type { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'

import { client } from "../config/redis";
import { logger } from "../common/utils/logger";
import { AuthenticatedRequest } from "../types";
import { TooManyRequestsError } from "../common/errors/AppError";



/**
 * ──────────────────────────────────────────────────────────────
 * Global
 * ──────────────────────────────────────────────────────────────
 * 100 request per minute per IP
 */
const globalRateLimiterOtp = {
    keyPrefix: "rate-limit:global",
    points: 100,
    duration: 60,
    blockDuration: 60,
};


/**
 * ──────────────────────────────────────────────────────────────
 * User Logged in
 * ──────────────────────────────────────────────────────────────
 * 300 request per minute per User + IP
 */
const globalLoggedInLimiterOtp = {
    keyPrefix: "rate-limit:LoggedIn",
    points: 300,
    duration: 60,
    blockDuration: 60,
};

/**
 * ─────────────────────────────────────────────────────────────
 * Login Limiter
 * ─────────────────────────────────────────────────────────────
 * To prevent password brute force.

 * 5 attempts / 15 min / IP
 * 10 attempts / hour / account
 * Lock account for 15 minutes after repeated failures.
 */
const loginLimiterOtp = {
    keyPrefix: "rate-limit:login",
    points: 5,
    duration: 60 * 15,
    blockDuration: 60 * 15,
};

/**
 * ──────────────────────────────────────────────────────────────
 * Registration Limiter
 * ──────────────────────────────────────────────────────────────
 * 5 registrations  / 1 hour / IP
 * Lock account for 60 minutes after repeated failures.
 */
const registrationPerHourLimiterOtp = {
    keyPrefix: "rate-limit:registrationPerHour",
    points: 5,
    duration: 60 * 60,
    blockDuration: 60 * 60,
};

/**
 * 10 registrations / day / IP
 */
const registrationPerDayLimiterOtp = {
    keyPrefix: "rate-limit:registrationPerDay",
    points: 10,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24,
};

/**
 * ──────────────────────────────────────────────────────────────
 * OTP Limiter
 * ──────────────────────────────────────────────────────────────
 * 1 OTP every 60 sec
 */
const otpPerMinuteLimiterOtp = {
    keyPrefix: "rate-limit:otpPerMinute",
    points: 1,
    duration: 60,
    blockDuration: 60,
};

/**
 * 5 OTPs / hour / phone
 */
const otpPerHourLimiterOtp = {
    keyPrefix: "rate-limit:otpPerHour",
    points: 5,
    duration: 60 * 60,
    blockDuration: 60 * 60,
};

/** 
 * 10 OTPs / day / phone
 */
const otpPerDayLimiterOtp = {
    keyPrefix: "rate-limit:otpPerDay",
    points: 10,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24,
};


/**
 * ──────────────────────────────────────────────────────────────
 * OTP Verification Limiter
 * ──────────────────────────────────────────────────────────────
 * 5 verification attempts / OTP
 */
const verifyOtpPerAttemptLimiterOtp = {
    keyPrefix: "rate-limit:verifyOtpVerifyPerAttempt",
    points: 5,
    duration: 60 * 60 * 3,
    blockDuration: 60 * 15,
};

/** 
 * 10 verification attempts/hour
*/
const verifyOtpPerHourLimiterOtp = {
    keyPrefix: "rate-limit:verifyOtpVerifyPerHour",
    points: 10,
    duration: 60 * 60,
    blockDuration: 60 * 60,
};

/**
 * ─────────────────────────────────────────────────────────────
 * Password Reset / Password forget
 * ─────────────────────────────────────────────────────────────
 * 3 reset requests / hour / email
 */
const resetPasswordPerHourLimiterOtp = {
    keyPrefix: "rate-limit:resetPasswordPerHour",
    points: 10,
    duration: 60 * 60,
    blockDuration: 60 * 60,
};

/**
 * 5 reset requests/day/IP
*/
const resetPasswordPerDayLimiterOtp = {
    keyPrefix: "rate-limit:resetPasswordPerDay",
    points: 10,
    duration: 60 * 60,
    blockDuration: 60 * 60,
};


type CreateLimitOpt = {
    prefix: string,
    points: number,
    duration: number,
    blockDuration: number
}
function createLimiter(
    opt: CreateLimitOpt
) {
    return new RateLimiterRedis({
        storeClient: client,
        keyPrefix: opt.prefix,
        points: otpPerDayLimiterOtp.points,
        duration: opt.duration,
        blockDuration: opt.blockDuration,
    });
}

function createRateLimitMiddleware(
    limiter: RateLimiterRedis,
    keyFn?: (req: Request) => string,
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const key = keyFn
            ? keyFn(req)
            : req.user?.sub ?? getClientIp(req);

        try {
            const result = await limiter.consume(key);
            res.setHeader('X-RateLimit-Limit', limiter.points);
            res.setHeader('X-RateLimit-Remaining', result.remainingPoints ?? 0);
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (result.msBeforeNext ?? 0)).toISOString());
            next();
        } catch (rejRes) {
            if (rejRes instanceof RateLimiterRes) {
                res.setHeader('X-RateLimit-Limit', limiter.points);
                res.setHeader('X-RateLimit-Remaining', 0);
                res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
                logger.warn(`Rate limit exceeded for key: ${key}`);
                throw new TooManyRequestsError(`Too many request`);
            } else {
                // Redis error – fail open
                logger.error('Rate limiter Redis error:', rejRes);
                next();
            }
        }
    };
}

export function loginRouter(){}



type RateLimitOptions = {
    keyPrefix: string;
    windowSeconds: number;
    maxRequests: number;
};

type RateLimitResult = {
    allowed: boolean;
    current: number,
    remaining: number;
    resetInSeconds: number;
};

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

export async function rateLimit(
    identifier: string,
    options: RateLimitOptions
): Promise<RateLimitResult> {
    const key = `${options.keyPrefix}:${identifier}`;

    const result = (await client.eval(
        RATE_LIMIT_LUA,
        1,
        key,
        options.maxRequests,
        options.windowSeconds
    )) as [number, number, number, number];

    const [allowed, current, remaining, resetInSeconds] = result;

    return {
        allowed: allowed === 1,
        current,
        remaining,
        resetInSeconds,
    };
}

function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];

    if (typeof forwarded === "string") {
        return forwarded.split(",")[0]!.trim();
    }

    return req.ip || req.socket.remoteAddress || "unknown";
}

export function globalRateLimiter(options?: Partial<RateLimitOptions>) {
    const config: RateLimitOptions = {
        keyPrefix: "rate-limit:global",
        windowSeconds: 60,
        maxRequests: 100,
        ...options,
    };

    return async (req: Request, res: Response, next: NextFunction) => {
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
        } catch (error) {
            next(error);
        }
    };
}

function rateLimiter(config: RateLimitOptions, error: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
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
        } catch (err) {
            next(err);
        }
    }
}


export function loginRateLimiter(options?: Partial<RateLimitOptions>) {
    const config: RateLimitOptions = {
        keyPrefix: "rate-limit:login",
        windowSeconds: 15 * 60,
        maxRequests: 5,
        ...options,
    };

    return rateLimiter(config, "Too many login attempts");
}

export function otpRateLimiter(options?: Partial<RateLimitOptions>) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:opt",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    }
    return rateLimiter(config, "Too many opt attempts");
}

export function registerRateLimiter(options?: Partial<RateLimitOptions>) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:register",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    }
    return rateLimiter(config, "Too many register attempts");
}
export function passwordResetRateLimiter(options?: Partial<RateLimitOptions>) {
    const config = {
        ...options,
        keyPrefix: "rate-limit:password-reset",
        windowSeconds: 15 * 60,
        maxRequests: 5,
    }
    return rateLimiter(config, "Too many password reset attempts");
}


interface ProgressiveDelayOptions {
    /** Requests before delay starts (default: 3) */
    threshold?: number;
    /** Base delay in ms, doubles each attempt (default: 500) */
    baseDelay?: number;
    /** Maximum delay cap in ms (default: 5000) */
    maxDelay?: number;
}

export function progressiveDelay(opts: ProgressiveDelayOptions = {}) {
    const {
        threshold = 3,
        baseDelay = 500,
        maxDelay = 5000,
    } = opts;

    return (req: Request, res: Response, next: NextFunction): void => {
        const info = res.locals.rateLimit as
            | RateLimitResult
            | undefined;

        const current = info?.current ?? 0;

        if (current <= threshold) {
            return next();
        }

        const exponent = current - threshold;

        const delay = Math.min(
            baseDelay * Math.pow(2, exponent - 1),
            maxDelay
        );

        logger.debug("Progressive delay applied", {
            ip: getClientIp(req),
            path: req.originalUrl,
            attempt: current,
            delayMs: delay,
        });

        setTimeout(() => next(), delay);
    };
}