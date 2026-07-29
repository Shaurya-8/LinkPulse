import { config } from "../../config";
// ─── Cookie Names ─────────────────────────────────────────────────────────────
// Centralised so a rename is one-line change, not a grep through the codebase.
export const COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    SESSION_ID: 'session_id',
};
// ─── TTL Constants ─────────────────────────────────────────────────────────────
const MS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
};
// Parse "15m", "7d", "1h" → milliseconds
function parseDurationToMs(duration) {
    const match = duration.match(/^(\d+)(m|h|d)$/);
    if (!match)
        return 15 * MS.MINUTE; // fallback: 15 minutes
    const value = parseInt(match[1], 10);
    switch (match[2]) {
        case 'm': return value * MS.MINUTE;
        case 'h': return value * MS.HOUR;
        case 'd': return value * MS.DAY;
        default: return 15 * MS.MINUTE;
    }
}
// ─── Base Cookie Options ───────────────────────────────────────────────────────
function baseOptions() {
    return {
        httpOnly: true, // Never accessible via document.cookie or JS APIs
        secure: config.app.isProd, // HTTPS-only in production; allow HTTP in dev
        sameSite: config.app.isProd ? 'strict' : 'lax',
        // domain: config.app.url
        // 'strict': cookie never sent on cross-site requests (safest, same-site only)
        // 'lax':    sent on top-level navigations (needed in dev for Postman / tools)
    };
}
/**
 * Set all three auth cookies on the response in a single call.
 * Call this from: login, verifyOtp, refreshToken handlers.
 */
export function setAuthCookies(res, payload) {
    const accessTtlMs = parseDurationToMs(config.jwt.accessExpires); // e.g. 15m → 900_000ms
    const refreshTtlMs = parseDurationToMs(config.jwt.refreshExpires); // e.g. 7d  → 604_800_000ms
    // ── access_token ────────────────────────────────────────────────────────────
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, payload.accessToken, {
        ...baseOptions(),
        path: '/',
        maxAge: accessTtlMs,
    });
    // ── refresh_token ───────────────────────────────────────────────────────────
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, payload.refreshToken, {
        ...baseOptions(),
        path: '/',
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
export function clearAuthCookies(res) {
    console.trace('clearAuthCookies called');
    const clearOptions = {
        ...baseOptions(),
        maxAge: 0, // Expires immediately
        expires: new Date(0),
    };
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { ...clearOptions, path: '/api' });
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { ...clearOptions, path: '/api/v1/auth/refresh' });
    res.clearCookie(COOKIE_NAMES.SESSION_ID, { ...clearOptions, path: '/api' });
}
// ─────────────────────────────────────────────────────────────────────────────
// READ COOKIES
// ─────────────────────────────────────────────────────────────────────────────
/** Extract access token from cookie OR Authorization header (supports both flows) */
export function extractAccessToken(req) {
    // 1. HttpOnly cookie (preferred — set by this server)
    const fromCookie = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
    if (fromCookie)
        return fromCookie;
    // 2. Authorization: Bearer <token> header (fallback for API clients, mobile apps)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
/** Extract refresh token from cookie OR request body */
export function extractRefreshToken(req) {
    // 1. HttpOnly cookie (browser clients)
    const fromCookie = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (fromCookie)
        return fromCookie;
    // 2. Request body (API clients, mobile apps that manage tokens manually)
    const fromBody = req.body?.refreshToken;
    if (fromBody && typeof fromBody === 'string')
        return fromBody;
    return null;
}
/** Extract session ID from cookie */
export function extractSessionId(req) {
    return req.cookies?.[COOKIE_NAMES.SESSION_ID] ?? null;
}
//# sourceMappingURL=cookies.js.map