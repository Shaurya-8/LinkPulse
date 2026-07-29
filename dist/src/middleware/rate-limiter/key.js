export const RateLimitKeys = {
    ip(req) {
        return getClientIp(req);
    },
    email(req) {
        return String(req.body?.email ?? "").trim().toLowerCase();
    },
    emailIp(req) {
        return `${RateLimitKeys.email(req)}:${RateLimitKeys.ip(req)}`;
    },
    requestId(req) {
        return String(req.body?.requestId ?? "");
    },
    userId(req) {
        return String(req.user?.id ?? "");
    },
    apiKey(req) {
        return String(req.headers["x-api-key"] ?? "");
    },
};
function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
}
//# sourceMappingURL=key.js.map