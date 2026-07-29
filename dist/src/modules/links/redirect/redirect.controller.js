import asyncHandler from "../../../common/utils/asyncHandler";
import { Redirect } from "./redirect.service";
import { parseUserAgent } from "../../../common/utils/useragent";
const redirectService = new Redirect();
export const redirectController = {
    redirect: asyncHandler(async (req, res) => {
        const shortCode = req.params.shortCode;
        // Build redirect context for rules engine
        const ua = parseUserAgent(req.headers['user-agent']);
        const acceptLanguage = req.headers['accept-language'] ?? '';
        const language = acceptLanguage.split(',')[0]?.split(';')[0] ?? null;
        const now = new Date();
        const context = {
            device: ua.device,
            country: null, // Resolved via geo in analytics worker
            language,
            hour: now.getUTCHours(),
            dayOfWeek: now.getUTCDay(),
            date: now.toISOString().split('T')[0],
        };
        const opts = {
            ipAddress: req.deviceInfo?.ipAddress,
            userAgent: req.headers['user-agent'] ?? null,
            referer: req.headers.referer ?? null,
            rawHeaders: JSON.stringify({
                'accept-language': req.headers['accept-language'],
                'cf-ipcountry': req.headers['cf-ipcountry'],
            }),
        };
        const result = await redirectService.redirect(shortCode, context, opts);
        // Perform redirect
        const statusCode = result.data.redirectType === 'PERMANENT' ? 301 : 302;
        // Security headers
        res.setHeader('X-Robots-Tag', 'noindex');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.redirect(statusCode, result.data.url);
    }),
};
//# sourceMappingURL=redirect.controller.js.map