import geoip from 'geoip-lite';
import { GeoInfo } from "../../types";
import { logger } from "./logger";

const PRIVATE_IP_RANGES = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^::1$/,
    /^fc00:/,
    /^169\.254\./,
];

function isPrivateIP(ip: string): boolean {
    return PRIVATE_IP_RANGES.some((range) => range.test(ip));
}

export function lookupGeo(ipAddress?: string | null): GeoInfo {
    if (!ipAddress || isPrivateIP(ipAddress)) {
        return {};
    }
    try {
        const geo = geoip.lookup(ipAddress);
        if (!geo) return {};
        return {
            country: geo.country ? countryCodeToName(geo.country) : undefined,
            countryCode: geo.country || undefined,
            region: geo.region || undefined,
            city: geo.city || undefined,
            latitude: geo.ll ? geo.ll[0] : undefined,
            longitude: geo.ll ? geo.ll[1] : undefined,
            timezone: geo.timezone || undefined,
        }
    } catch (error) {
        logger.error(`GeoIP lookup failed for IP: ${ipAddress}`, error);
        return {};
    }
}

export function extractIP(
    headers: Record<string, string | string[] | undefined>,
    remoteAddress?: string
): string | null {
    const forwarded = headers['x-forwarded-for'];
    if (forwarded) {
        const firstIp = Array.isArray(forwarded)
            ? forwarded[0]
            : forwarded.split(',')[0]?.trim();
        if (firstIp) return firstIp;
    }

    const cfConnecting = headers['cf-connecting-ip'];
    if(cfConnecting) {
        const firstIp = Array.isArray(cfConnecting)
            ? cfConnecting[0]
            : cfConnecting.split(',')[0]?.trim();
        if (firstIp) return firstIp;
    }
    return remoteAddress || null;
}

//  Basic country code → name mapping (extend as needed)
const COUNTRY_NAMES: Record<string, string> = {
    US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
    JP: 'Japan', CN: 'China', IN: 'India', BR: 'Brazil', CA: 'Canada',
    AU: 'Australia', RU: 'Russia', KR: 'South Korea', IT: 'Italy',
    ES: 'Spain', MX: 'Mexico', ID: 'Indonesia', NL: 'Netherlands',
    TR: 'Turkey', SA: 'Saudi Arabia', PK: 'Pakistan', NG: 'Nigeria',
    PH: 'Philippines', AR: 'Argentina', EG: 'Egypt', TH: 'Thailand',
    UA: 'Ukraine', PL: 'Poland', SE: 'Sweden', NZ: 'New Zealand',
    SG: 'Singapore', MY: 'Malaysia', VN: 'Vietnam', ZA: 'South Africa',
};

function countryCodeToName(code: string): string {
    return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

