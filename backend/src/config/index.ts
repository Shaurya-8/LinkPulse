import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requiredEvn(key: string): string {

    const value = process.env[key];
    if (!value || value == '') {
        throw new Error(
            ` [config] Missing required environment variable: "${key}". ` +
            `Check your .env file or platform environment settings.`
        )
    }
    return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
    const value = process.env[key];
    if (!value || value == null) return fallback.trim();
    return value.trim();
}

function intEnv(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw || raw == '') return fallback;
    const parsed = parseInt(raw.trim(), 10);
    if (isNaN(parsed)) {
        throw new Error(
            `[config] Environment variable ${key} must be an integer, got ${raw}.`
        )
    }
    return parsed;
}

function boolEnv(key: string, fallback: boolean): boolean {
    const value = process.env[key];
    if (!value || value === '') return fallback;
    return value.trim().toLowerCase() === 'true';
}


const node_env = optionalEnv('NODE_ENV', 'development');

export const config = {
    app: {
        name: optionalEnv('APP_NAME', 'linkpulse'),
        url: optionalEnv('APP_URL', 'http://localhost'),
        frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
        port: intEnv('PORT', 8000),
        api: requiredEvn('API_VERSION'),
        env: node_env,
        isDev: node_env === 'development',
        isProd: node_env === 'production',
        test: node_env === 'test'
    },

    db: {
        url: requiredEvn('DATABASE_URL')
    },

    redis: {
        url: requiredEvn('REDIS_URL'),
        password: requiredEvn('REDIS_PASSWORD'),
        tls: boolEnv('REDIS_TLS', false)
    },

    // ─── JWT ──────────────────────────────────────────────────────────────────────
    jwt: {
        accessSecret: requiredEvn('JWT_ACCESS_SECRET'),
        refreshSecret: requiredEvn('JWT_REFRESH_SECRET'),

        refreshExpires: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
        accessExpires: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m')
    },

    // ─── OTP ──────────────────────────────────────────────────────────────────────
    otp: {
        length: intEnv('OTP_LENGTH', 6),
        expiresMinutes: intEnv('OTP_EXPIRES_MINUTES', 10),
        attempt: intEnv('OTP_MAX_ATTEMPTS', 5),
        cooldown: intEnv('OTP_RESEND_COOLDOWN_SECONDS', 60)
    },

    // ─── Email (SMTP) ─────────────────────────────────────────────────────────────
    Email: {
        host: requiredEvn('SMTP_HOST'),
        port: intEnv('SMTP_PORT', 1025),
        secure: boolEnv('SMTP_SECURE', false),
        user: requiredEvn('SMTP_USER'),
        pass: requiredEvn('SMTP_PASS'),
        emailFrom: optionalEnv('EMAIL_FROM', "AuthSystem <no-reply@authsystem.com>")
    },

    security: {

        bcryptRounds: intEnv('BCRYPT_ROUNDS', 12),

        // ── Global rate limiter (all endpoints) ────────────────────────────────────
        rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 900_000), // 15 min
        rateLimitMax: intEnv('RATE_LIMIT_MAX_REQUESTS', 100),

        // ── Auth rate limiter (login / register / verify-otp) ──────────────────────
        authRateLimitWindowMs: intEnv('AUTH_RATE_LIMIT_WINDOW_MS', 900_000), // 15 min
        authRateLimitMax: intEnv('AUTH_RATE_LIMIT_MAX', 10),

        // ── OTP rate limiter (resend-otp only) ─────────────────────────────────────
        otpRateLimitWindowMs: intEnv('OTP_RATE_LIMIT_WINDOW_MS', 3_600_000), // 1 hr
        otpRateLimitMax: intEnv('OTP_RATE_LIMIT_MAX', 5),

        // ── Refresh token rate limiter ──────────────────────────────────────────────
        refreshRateLimitWindowMs: intEnv('REFRESH_RATE_LIMIT_WINDOW_MS', 900_000), // 15 min
        refreshRateLimitMax: intEnv('REFRESH_RATE_LIMIT_MAX', 30),

        // ── CORS ───────────────────────────────────────────────────────────────────
        corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:8000')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),

        // ── Brute-force account lockout ─────────────────────────────────────────────
        // After N consecutive failed login attempts, the account is locked for M minutes.
        lockoutThreshold: intEnv('ACCOUNT_LOCKOUT_THRESHOLD', 10),
        lockoutDurationMins: intEnv('ACCOUNT_LOCKOUT_DURATION_MINUTES', 30),
    },

    // ── Session ───────────────────────────────────────────────────────────────────

    session: {
        // How many concurrent active sessions a user can have.
        // When exceeded, the oldest session is evicted automatically.
        maxPerUser: intEnv('SESSION_MAX_PER_USER', 5),

        // When true, /refresh issues a brand-new refresh token and invalidates the old one.
        // This is the "refresh token rotation" pattern — a stolen token can only be
        // used once before the real user's next refresh triggers a reuse-detection alert.
        refreshTokenRotation: boolEnv('REFRESH_TOKEN_ROTATION', true),
    },
    // ── Scheduled Cleanup Jobs ────────────────────────────────────────────────────

    cleanup: {
        cronSchedule: optionalEnv('CLEANUP_CRON_SCHEDULE', '0 3 * * *'),
        otpRetentionHours: intEnv('OTP_RETENTION_HOURS', 24),
        sessionRetentionDays: intEnv('SESSION_RETENTION_DAYS', 90),
        auditLogRetentionDays: intEnv('AUDIT_LOG_RETENTION_DAYS', 365),
    },

    link: {
        linkExpireYear: optionalEnv('LINK_EXPIRE_Year', '5y'),
        maxRetry: intEnv('MAX_RETRY', 5),

        ttl: intEnv('LINK_TTL',30*60)
    }

};

export type config = typeof config;
export type app = typeof config.app;
export type db = typeof config.db;
export type redis = typeof config.redis;
export type jwt = typeof config.jwt;
export type otp = typeof config.otp;
export type Email = typeof config.Email;
export type security = typeof config.security;
export type session = typeof config.session;
export type cleanup = typeof config.cleanup;
export type link = typeof config.link;
