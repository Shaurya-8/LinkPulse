import { config } from "../../../config";
import { LinkWithMeta } from "../links.type";

export function formatLink(link: Record<string, unknown>): LinkWithMeta {
    return {
        id: link.id as string,
        shortCode: link.shortCode as string,
        shortUrl: buildShortUrl(link.shortCode as string),
        originalUrl: link.originalUrl as string,
        title: (link.title ?? null) as string | null,
        description: (link.description ?? null) as string | null,
        status: link.status as string,
        clickCount: (link.clickCount as number) ?? 0,
        maxClicks: (link.maxClicks ?? null) as number | null,
        isPasswordProtected: !!(link.passwordHash as string | null),
        expiresAt: (link.expiresAt ?? null) as Date | null,
        createdAt: link.createdAt as Date,
        updatedAt: link.updatedAt as Date,
        tags: (link.tags as Array<{ id: string; name: string; color: string }>) ?? [],
        qrCode: (link.qrCode ?? null) as { pngUrl?: string | null; svgData?: string | null } | null,
    };
}

export function buildShortUrl(shortCode: string): string {
    return `${config.app.url}/${shortCode}`;
}
