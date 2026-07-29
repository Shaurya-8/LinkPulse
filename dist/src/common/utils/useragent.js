import { UAParser } from 'ua-parser-js';
import { isbot } from 'isbot';
/**
 * Parse a User-Agent string into structured device/browser/OS info.
 */
export function parseUserAgent(userAgentString) {
    if (!userAgentString) {
        return {
            browser: null,
            browserVersion: null,
            os: null,
            osVersion: null,
            device: null,
            isBot: false,
            botName: null,
        };
    }
    // Bot detection first
    const isBotUA = isbot(userAgentString);
    if (isBotUA) {
        return {
            browser: null,
            browserVersion: null,
            os: null,
            osVersion: null,
            device: 'bot',
            isBot: true,
            botName: extractBotName(userAgentString),
        };
    }
    const parser = new UAParser(userAgentString);
    const result = parser.getResult();
    // Determine device type
    let device = 'desktop';
    const deviceType = result.device?.type;
    if (deviceType === 'mobile')
        device = 'mobile';
    else if (deviceType === 'tablet')
        device = 'tablet';
    const browser = normalizeBrowserName(result.browser?.name ?? null);
    const browserVersion = result.browser?.version ?? null;
    const os = normalizeOsName(result.os?.name ?? null);
    const osVersion = result.os?.version ?? null;
    return {
        browser,
        browserVersion: browserVersion ? browserVersion.split('.')[0] ?? null : null, // major version only
        os,
        osVersion: osVersion ? osVersion.split('.')[0] ?? null : null,
        device,
        isBot: false,
        botName: null,
    };
}
function normalizeBrowserName(name) {
    if (!name)
        return null;
    const normalized = {
        'Chrome': 'Chrome',
        'Chromium': 'Chrome',
        'Firefox': 'Firefox',
        'Safari': 'Safari',
        'Mobile Safari': 'Safari',
        'Edge': 'Edge',
        'Edg': 'Edge',
        'Opera': 'Opera',
        'Internet Explorer': 'Internet Explorer',
        'Samsung Browser': 'Samsung Browser',
        'UCBrowser': 'UC Browser',
        'Brave': 'Brave',
    };
    return normalized[name] ?? name;
}
function normalizeOsName(name) {
    if (!name)
        return null;
    const normalized = {
        'Windows': 'Windows',
        'Mac OS': 'macOS',
        'iOS': 'iOS',
        'Android': 'Android',
        'Linux': 'Linux',
        'Ubuntu': 'Linux',
        'Debian': 'Linux',
        'Chrome OS': 'Chrome OS',
    };
    return normalized[name] ?? name;
}
function extractBotName(ua) {
    const botPatterns = [
        [/Googlebot/i, 'Googlebot'],
        [/bingbot/i, 'Bingbot'],
        [/Slurp/i, 'Yahoo Slurp'],
        [/DuckDuckBot/i, 'DuckDuckBot'],
        [/Baiduspider/i, 'Baiduspider'],
        [/YandexBot/i, 'YandexBot'],
        [/facebookexternalhit/i, 'Facebook Crawler'],
        [/Twitterbot/i, 'Twitterbot'],
        [/LinkedInBot/i, 'LinkedInBot'],
        [/Slackbot/i, 'Slackbot'],
    ];
    for (const [pattern, name] of botPatterns) {
        if (pattern.test(ua))
            return name;
    }
    return 'Unknown Bot';
}
//# sourceMappingURL=useragent.js.map