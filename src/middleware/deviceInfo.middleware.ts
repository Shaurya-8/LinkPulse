import { Request, Response, NextFunction } from 'express';
import { UAParser, IResult } from 'ua-parser-js';
import crypto from 'crypto';

// import { AuthenticatedRequest } from '../modules/auth/auth.types';
import { DeviceInfo, DeviceType } from '../types';
import { logger } from '../common/utils/logger';
import { DeviceFingerprint } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// IP EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────
function extractIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];

    if (xForwardedFor) {
        // May be a comma-separated list: "client, proxy1, proxy2"
        // The leftmost IP is the original client
        const raw = Array.isArray(xForwardedFor)
            ? xForwardedFor[0]
            : xForwardedFor;
        const first = raw?.split(',')[0]!.trim();
        if (first) return first;
    }

    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
        return Array.isArray(xRealIp) ? xRealIp[0]! : xRealIp;
    }

    return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE TYPE MAPPING
// ─────────────────────────────────────────────────────────────────────────────
function mapDeviceType(uaDeviceType: string | undefined): DeviceInfo['deviceType'] {
    switch (uaDeviceType?.toLowerCase()) {
        case 'mobile': return DeviceType.MOBILE
        case 'tablet': return DeviceType.TABLET;
        case 'console':
        case 'smarttv':
        case 'wearable':
        case 'embedded': return DeviceType.UNKNOWN;
        default: return DeviceType.DESKTOP; // undefined = desktop or bot
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE NAME BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildDeviceName(parsed: IResult, deviceType: DeviceInfo['deviceType']): string {
    const parts: string[] = [];

    // Hardware model (mobile/tablet only)
    if (parsed.device.vendor) parts.push(parsed.device.vendor);
    if (parsed.device.model) parts.push(parsed.device.model);

    // OS
    if (parsed.os.name) {
        const osStr = parsed.os.version
            ? `${parsed.os.name} ${parsed.os.version}`
            : parsed.os.name;
        parts.push(parts.length ? `(${osStr})` : osStr);
    }

    // Fallback: use browser + device type
    if (parts.length === 0) {
        const browserStr = parsed.browser.name
            ? `${parsed.browser.name}${parsed.browser.major ? ` ${parsed.browser.major}` : ''}`
            : null;
        return [browserStr, `on ${deviceType}`]
            .filter(Boolean)
            .join(' ');
    }

    // Desktop: prefix with browser
    if (deviceType === 'DESKTOP' && parsed.browser.name) {
        const browserStr = parsed.browser.major
            ? `${parsed.browser.name} ${parsed.browser.major}`
            : parsed.browser.name;
        return `${browserStr} on ${parts.join(' ')}`;
    }

    return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────
function buildFingerprint(req: Request, parsed: IResult, deviceType: DeviceInfo['deviceType']): DeviceFingerprint {
    const components = [
        req.headers['user-agent'] ?? '',
        parsed.os.name ?? '',
        parsed.os.version ?? '',
        parsed.cpu.architecture ?? '',
        deviceType,
        req.headers['accept-language'] ?? '',
    ].join('||');  // '||' separator prevents accidental collisions

    return crypto.createHash('sha256').update(components).digest('hex') as DeviceFingerprint;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
export function extractDeviceInfo(req: Request): DeviceInfo {
    const rawUa = req.headers['user-agent'] ?? '';
    const ipAddress = extractIp(req);

    let parsed: IResult;
    try {
        parsed = new UAParser(rawUa).getResult();
    } catch {
        // Malformed UA — degrade gracefully rather than crashing the request
        logger.warn('UA parsing failed', { ua: rawUa.slice(0, 200) });
        parsed = new UAParser('').getResult();
    }

    const deviceType = mapDeviceType(parsed.device.type);
    const deviceFingerprint = buildFingerprint(req, parsed, deviceType);
    const deviceName = buildDeviceName(parsed, deviceType);

    return {
        deviceFingerprint,
        deviceName,
        deviceType,
        os: parsed.os.name ?? null,
        osVersion: parsed.os.version ?? null,
        browser: parsed.browser.name ?? null,
        browserVersion: parsed.browser.major ?? null,
        cpu: parsed.cpu.architecture ?? null,
        userAgent: rawUa,
        ipAddress,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
export function deviceInfoMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    try {
        req.deviceInfo = extractDeviceInfo(req);
    } catch (err) {
        logger.error('deviceInfoMiddleware: unexpected error', { err });
        req.deviceInfo = {
            deviceFingerprint: 'unknown' as DeviceFingerprint,
            deviceName: 'Unknown Device',
            deviceType: DeviceType.UNKNOWN,
            os: null,
            osVersion: null,
            browser: null,
            browserVersion: null,
            cpu: null,
            userAgent: req.headers['user-agent'] ?? '',
            ipAddress: extractIp(req),
        };
    }

    next();
}