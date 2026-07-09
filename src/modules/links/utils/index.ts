import crypto from "crypto"
import { BadRequestError } from "../../../common/errors/AppError";

import { Request } from "express";
import { DeviceInfo } from "../../../types";

/**
 * ─────────────── validateUrl ────────────────────────────
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const TRACKING_PARAMS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
]);

const IP_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function validateUrl(url: string): URL {
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        throw new BadRequestError("Not Valid URL");
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        throw new BadRequestError("Only HTTP and HTTPS URLs are allowed");
    }

    const host = parsed.hostname;

    if (
        host === "localhost" ||
        IP_REGEX.test(host) ||
        !DOMAIN_REGEX.test(host)
    ) {
        throw new BadRequestError("Invalid hostname");
    }

    return parsed;
}


/**
 * ───────────────Normalize url────────────────────────────
 */
export function normalizeUrl(urlString: string): string {
    const url = validateUrl(urlString);

    // normalize basic fields
    url.hostname = url.hostname.toLowerCase();

    // remove default ports
    if (
        (url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")
    ) {
        url.port = "";
    }

    // fast path for cleanup
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
    }

    // remove tracking params in single loop (faster Set lookup)
    for (const key of TRACKING_PARAMS) {
        url.searchParams.delete(key);
    }

    return url.toString();
}

export function linkExpireAt(): Date {
    return new Date(Date.now())
}

// ──────────────── Generate ShortCode ─────────────

export default function generateShortCode(): string {

    const ALPHANUMERIC = "01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const MAX_LENGTH = 8;
    return Array.from(
        { length: MAX_LENGTH },
        () => ALPHANUMERIC[crypto.randomInt(ALPHANUMERIC.length)]
    ).join("");
}


// ───────────────Get Device ────────────────
export function requireDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError('Device information could not be determined.');
    }
    return device;
}
