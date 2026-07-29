import { config } from "../../../config";
export function formatLink(link) {
    return {
        id: link.id,
        shortCode: link.shortCode,
        shortUrl: buildShortUrl(link.shortCode),
        originalUrl: link.originalUrl,
        title: (link.title ?? null),
        description: (link.description ?? null),
        status: link.status,
        clickCount: link.clickCount ?? 0,
        maxClicks: (link.maxClicks ?? null),
        isPasswordProtected: !!link.passwordHash,
        expiresAt: (link.expiresAt ?? null),
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        tags: link.tags ?? [],
        qrCode: (link.qrCode ?? null),
    };
}
export function buildShortUrl(shortCode) {
    return `${config.app.url}/${shortCode}`;
}
//# sourceMappingURL=formatLink.js.map