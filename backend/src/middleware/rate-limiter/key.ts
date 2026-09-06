import { Request } from "express";

export const RateLimitKeys = {
  ip(req: Request): string {
    return getClientIp(req);
  },

  email(req: Request): string {
    return String(req.body?.email ?? "").trim().toLowerCase();
  },

  emailIp(req: Request): string {
    return `${RateLimitKeys.email(req)}:${RateLimitKeys.ip(req)}`;
  },

  requestId(req: Request): string {
    return String(req.body?.requestId ?? "");
  },

  userId(req: Request): string {
    return String((req as any).user?.id ?? "");
  },

  apiKey(req: Request): string {
    return String(req.headers["x-api-key"] ?? "");
  },
} as const;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]!.trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}