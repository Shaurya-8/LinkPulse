import Redis from 'ioredis';
import { config } from '.';
import { logger } from "../common/utils/logger";
let redisClient = null;
function attchListener(redisClient) {
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('ready', () => logger.info('Redis client ready'));
    redisClient.on('error', (err) => logger.error('Redis error', { err }));
    redisClient.on('close', () => logger.info('Redis connectiong closed'));
    redisClient.on('reconnecting', () => logger.info('Redis reconnecting...'));
    redisClient.on('end', () => logger.warn('Redis connection ended'));
}
function getRedisClient() {
    if (redisClient)
        return redisClient;
    redisClient = new Redis(config.redis.url, {
        password: config.redis.password || undefined,
        tls: config.redis.tls ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times) {
            if (times > 10) {
                logger.error('Redis max try reached');
                return null;
            }
            const delay = Math.min(times * 100, 3000);
            const jitter = Math.random() * 500;
            logger.warn(`Redis try attempt ${times} reconnect in ${delay + jitter}`);
            return jitter + delay;
        },
    });
    attchListener(redisClient);
    return redisClient;
}
// ─── Typed Cache Helpers ───────────────────────────────────────────────────────
export const client = getRedisClient();
export { client as redisClient };
export const cache = {
    async get(key) {
        try {
            const value = await client.get(key);
            if (value === null)
                return null;
            return JSON.parse(value);
        }
        catch (err) {
            logger.error("Failed to parse cache value", {
                key,
                err
            });
            return null;
        }
    },
    async set(key, value, ttlSeconds) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
            await client.set(key, serialized, "EX", ttlSeconds);
        }
        else {
            await client.set(key, serialized);
        }
    },
    async setIfAbsent(key, value, ttl) {
        const serialized = JSON.stringify(value);
        const result = ttl
            ? await client.set(key, serialized, "EX", ttl, "NX")
            : await client.set(key, serialized, "NX");
        return result === "OK";
    },
    async del(...key) {
        if (key.length > 0)
            await client.del(...key);
    },
    async exists(key) {
        const result = await client.exists(key);
        return result === 1;
    },
    async ttl(key) {
        return client.ttl(key);
    },
    async expire(key, ttlSeconds) {
        await client.expire(key, ttlSeconds);
    },
    async hset(key, field, value) {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        await client.hset(key, field, serialized);
    },
    async hget(key, field) {
        const value = await client.hget(key, field);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            logger.warn("Redis JSON parse failed", { key, value });
            return null;
        }
    },
    async hdel(key, ...field) {
        if (field.length > 0)
            await client.hdel(key, ...field);
    },
    async sadd(key, ...member) {
        await client.sadd(key, ...member);
    },
    async srem(key, ...members) {
        await client.srem(key, ...members);
    },
    async smembers(key) {
        return client.smembers(key);
    },
};
// ─── Cache Key Builders ───────────────────────────────────────────────────────
export const cacheKeys = {
    // OTP
    otpSessionData: (requestId) => `otp:otpSession:${requestId}`,
    otpVerify: (verificationId) => `otp:verificationId:${verificationId}`,
    otpCooldown: (email) => `otp:cooldown:${email}`,
    otpAttempts: (email) => `otp:attempts:${email}`,
    // Session / jwt Blocklist
    revokedAccessToken: (jti) => `revoked:access:${jti}`,
    userSessions: (userId) => `user:session:${userId}`,
    // Rate limiting
    loginAttempts: (ip) => `rate:login:${ip}`,
    otpRequests: (ip) => `rate:otp:${ip}`,
    // user cache
    userById: (userId) => `user:userId:${userId}`,
    userByEmail: (email) => `user:email:${email}`,
    // registerUser: (verificationId: string) => `user:verficiationId:${verificationId}`,
    // resetPassword
    // link
    shortLink: (code) => `link:code:${code}`,
    linkById: (userId, id) => `link:${userId}:${id}`,
    // Dashboard
    dashboardStats: (userId) => `dashboard:${userId}:stats`,
};
export async function redisHealthCheck() {
    try {
        await client.ping();
        return true;
    }
    catch {
        return false;
    }
}
export async function connectRedis() {
    await client.ping();
    logger.info("Redis ping successfull");
}
export async function disconnectRedis() {
    await client.quit();
    logger.info("Redis disconnected");
}
//# sourceMappingURL=redis.js.map