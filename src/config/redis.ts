import Redis from 'ioredis';
import { config } from '.'
import { logger } from "../common/utils/logger"
import { RefreshToken, UserId } from '../types';


let redisClient: Redis | null = null;

function attchListener(redisClient: Redis) {
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('ready', () => logger.info('Redis client ready'));
    redisClient.on('error', (err) => logger.error('Redis error', { err }));
    redisClient.on('close', () => logger.info('Redis connectiong closed'));
    redisClient.on('reconnecting', () => logger.info('Redis reconnecting...'));
    redisClient.on('end', () => logger.warn('Redis connection ended'));
}


function getRedisClient(): Redis {
    if (redisClient) return redisClient;

    redisClient = new Redis(config.redis.url, {
        password: config.redis.password || undefined,
        tls: config.redis.tls ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times) {
            if (times > 10) {
                logger.error('Redis max try reached')
                return null;
            }

            const delay = Math.min(times * 100, 3000);
            const jitter = Math.random() * 500;
            logger.warn(`Redis try attempt ${times} reconnect in ${delay + jitter}`)
            return jitter + delay;
        },
    });

    attchListener(redisClient);
    return redisClient;
}

// ─── Typed Cache Helpers ───────────────────────────────────────────────────────

export const client = getRedisClient();
export { client as redisClient };
type T = typeof redisClient;
export const cache = {
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await client.get(key);

            if (value === null)
                return null;

            return JSON.parse(value) as T;
        } catch (err) {
            logger.error("Failed to parse cache value", {
                key,
                err
            });

            return null;
        }
    },

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
            await client.set(key, serialized, "EX", ttlSeconds);
        } else {
            await client.set(key, serialized);
        }
    },
    async setIfAbsent(
        key: string,
        value: unknown,
        ttl?: number
    ): Promise<boolean> {
        const serialized = JSON.stringify(value);
        const result = ttl
            ? await client.set(key, serialized, "EX", ttl, "NX")
            : await client.set(key, serialized, "NX");
        return result === "OK";
    },
    async del(...key: string[]): Promise<void> {
        if (key.length > 0) await client.del(...key);
    },

    async exists(key: string): Promise<boolean> {
        const result = await client.exists(key);
        return result === 1;
    },

    async ttl(key: string): Promise<number> {
        return client.ttl(key);
    },

    async expire(key: string, ttlSeconds: number): Promise<void> {
        await client.expire(key, ttlSeconds);
    },

    async hset(key: string, field: string, value: unknown): Promise<void> {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        await client.hset(key, field, serialized);
    },

    async hget<T>(key: string, field: string): Promise<T | null> {
        const value = await client.hget(key, field);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            logger.warn("Redis JSON parse failed", { key, value });
            return null;
        }
    },

    async hdel(key: string, ...field: string[]): Promise<void> {
        if (field.length > 0) await client.hdel(key, ...field);
    },

    async sadd(key: string, ...member: string[]): Promise<void> {
        await client.sadd(key, ...member);
    },

    async srem(key: string, ...members: string[]): Promise<void> {
        await client.srem(key, ...members);
    },

    async smembers(key: string): Promise<string[]> {
        return client.smembers(key);
    },
}

// ─── Cache Key Builders ───────────────────────────────────────────────────────

export const cacheKeys = {
    // OTP
    otpSessionData: (requestId: string) => `otp:otpSession:${requestId}`,
    otpVerify: (verificationId: string) => `otp:verificationId:${verificationId}`,
    otpCooldown: (email: string) => `otp:cooldown:${email}`,
    otpAttempts: (email: string) => `otp:attempts:${email}`,

    // Session / jwt Blocklist
    revokedAccessToken: (jti: string) => `revoked:access:${jti}`,
    userSessions: (userId: string) => `user:session:${userId}`,

    // Rate limiting
    loginAttempts: (ip: string) => `rate:login:${ip}`,
    otpRequests: (ip: string) => `rate:otp:${ip}`,

    // user cache
    userById: (userId: UserId) => `user:userId:${userId}`,
    userByEmail: (email: string) => `user:email:${email}`,
    // registerUser: (verificationId: string) => `user:verficiationId:${verificationId}`,

    // resetPassword

    // link
    shortLink: (code: string) => `link:code:${code}`,
    linkById: (userId: UserId, id: string) => `link:${userId}:${id}`,

    // Dashboard
    dashboardStats: (userId: UserId) => `dashboard:${userId}:stats`,
}

export async function redisHealthCheck() {
    try {
        await client.ping();
        return true;
    } catch {
        return false;
    }
}

export async function connectRedis(): Promise<void> {
    await client.ping();
    logger.info("Redis ping successfull");
}

export async function disconnectRedis(): Promise<void> {
    await client.quit();
    logger.info("Redis disconnected")
}



