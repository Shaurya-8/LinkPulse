import { Response, CookieOptions } from "express";
import { config } from "../../config"

// ─── Cookie Names ─────────────────────────────────────────────────────────────
// Centralised so a rename is one-line change, not a grep through the codebase.
export const COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    SESSION_ID: 'session_id',
} as const;


export type CookieName = typeof COOKIE_NAMES[keyof typeof COOKIE_NAMES];

// ─── TTL Constants ─────────────────────────────────────────────────────────────
const MS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
};

// Parse "15m", "7d", "1h" → milliseconds
function parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)(m|h|d)$/);
    if (!match) return 15 * MS.MINUTE; // fallback: 15 minutes

    const value = parseInt(match[1]!, 10);
    switch (match[2]) {
        case 'm': return value * MS.MINUTE;
        case 'h': return value * MS.HOUR;
        case 'd': return value * MS.DAY;
        default: return 15 * MS.MINUTE;
    }
}


// ─── Base Cookie Options ───────────────────────────────────────────────────────
function baseOptions(): CookieOptions {
    return {
        httpOnly: true,   // Never accessible via document.cookie or JS APIs
        secure: config.app.isProd,  // HTTPS-only in production; allow HTTP in dev
        sameSite: config.app.isProd ? 'strict' : 'lax',
        // domain: config.app.url
        // 'strict': cookie never sent on cross-site requests (safest, same-site only)
        // 'lax':    sent on top-level navigations (needed in dev for Postman / tools)
    };
}


// ─────────────────────────────────────────────────────────────────────────────
// SET COOKIES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthCookiePayload {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
}


/**
 * Set all three auth cookies on the response in a single call.
 * Call this from: login, verifyOtp, refreshToken handlers.
 */
export function setAuthCookies(res: Response, payload: AuthCookiePayload): void {
    const accessTtlMs = parseDurationToMs(config.jwt.accessExpires);   // e.g. 15m → 900_000ms
    const refreshTtlMs = parseDurationToMs(config.jwt.refreshExpires);  // e.g. 7d  → 604_800_000ms

    // ── access_token ────────────────────────────────────────────────────────────
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, payload.accessToken, {
        ...baseOptions(),
        path: '/',
        maxAge: accessTtlMs,
    });


    // ── refresh_token ───────────────────────────────────────────────────────────
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, payload.refreshToken, {
        ...baseOptions(),
        path: '/api/v1/auth/refresh',
        maxAge: refreshTtlMs,
    });

    // ── session_id ──────────────────────────────────────────────────────────────
   res.cookie(COOKIE_NAMES.SESSION_ID, payload.sessionId, {
        ...baseOptions(),
        path: '/',
        maxAge: refreshTtlMs, // same lifetime as refresh token
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR COOKIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expire all three auth cookies immediately.
 * Call this from: logout, logoutAll handlers.
 */
export function clearAuthCookies(res: Response): void {
    const clearOptions: CookieOptions = {
        ...baseOptions(),
        maxAge: 0,  // Expires immediately
        expires: new Date(0),
    };

    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { ...clearOptions, path: '/' });
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { ...clearOptions, path: '/api/v1/auth/refresh' });
    res.clearCookie(COOKIE_NAMES.SESSION_ID, { ...clearOptions, path: '/' });
}


// ─────────────────────────────────────────────────────────────────────────────
// READ COOKIES
// ─────────────────────────────────────────────────────────────────────────────

/** Extract access token from cookie OR Authorization header (supports both flows) */
export function extractAccessToken(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string | null {
    // 1. HttpOnly cookie (preferred — set by this server)
    const fromCookie = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
    if (fromCookie) return fromCookie;

    // 2. Authorization: Bearer <token> header (fallback for API clients, mobile apps)
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

/** Extract refresh token from cookie OR request body */
export function extractRefreshToken(req: {
    cookies?: Record<string, string>;
    body?: { refreshToken?: string };
}): string | null {
    // 1. HttpOnly cookie (browser clients)
    const fromCookie = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (fromCookie) return fromCookie;

    // 2. Request body (API clients, mobile apps that manage tokens manually)
    const fromBody = req.body?.refreshToken;
    if (fromBody && typeof fromBody === 'string') return fromBody;

    return null;
}

/** Extract session ID from cookie */
export function extractSessionId(req: { cookies?: Record<string, string> }): string | null {
    return req.cookies?.[COOKIE_NAMES.SESSION_ID] ?? null;
}
