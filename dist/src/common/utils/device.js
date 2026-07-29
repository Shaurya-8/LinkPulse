import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';
import { DeviceType } from '../../types';
function getIpAddress(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return ips.split(',')[0].trim();
    }
    return (req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown');
}
function mapDeviceType(type) {
    switch (type?.toLowerCase()) {
        case 'mobile': return DeviceType.MOBILE;
        case 'tablet': return DeviceType.TABLET;
        case 'console':
        case 'smarttv':
        case 'wearable':
        case 'embedded': return DeviceType.UNKNOWN;
        default: return DeviceType.DESKTOP;
    }
}
export function extractDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const ipAddress = getIpAddress(req);
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const os = result.os.name ?? null;
    const osVersion = result.os.version ?? null;
    const browser = result.browser.name ?? null;
    const browserVersion = result.browser.major ?? null;
    const cpu = result.cpu.architecture ?? null;
    const deviceType = mapDeviceType(result.device.type);
    // Build a stable device name
    const deviceName = [
        result.device.vendor,
        result.device.model,
        os,
        osVersion ? `(${osVersion})` : null,
    ]
        .filter(Boolean)
        .join(' ') || `${deviceType} - ${browser ?? 'Unknown Browser'}`;
    // Fingerprint: hash of stable device attributes (not IP, not session)
    const fingerprintInput = [
        userAgent,
        req.headers['accept-language'] ?? '',
        cpu ?? '',
        os ?? '',
        osVersion ?? '',
        deviceType,
    ].join('|');
    const deviceFingerprint = crypto
        .createHash('sha256')
        .update(fingerprintInput)
        .digest('hex');
    return {
        deviceFingerprint,
        deviceName,
        deviceType,
        os,
        osVersion,
        browser,
        browserVersion,
        cpu,
        userAgent,
        ipAddress,
    };
}
//# sourceMappingURL=device.js.map