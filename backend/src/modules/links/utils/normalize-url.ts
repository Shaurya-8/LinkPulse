import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { domainToASCII } from "node:url";

import path from "node:path";

export interface NormalizeUrlOptions {
    removeTrackingParams?: boolean;
    removeTrailingSlash?: boolean;
    removeDuplicateQueryParams?: boolean;
    allowedProtocols?: readonly string[];
}

const DEFAULT_OPTIONS: NormalizeUrlOptions = {
    removeTrackingParams: true,
    removeTrailingSlash: true,
    removeDuplicateQueryParams: true,
    allowedProtocols: ["http:", "https:"],
};


export async function isPublicHost(host: string): Promise<boolean> {
    const { address } = await dns.lookup(host);

    const ip = ipaddr.parse(address);

    return ip.range() === "unicast";
}




const TRACKING_PARAMS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gclid",
    "fbclid",
    "msclkid",
    "igshid",
    "mc_cid",
    "mc_eid",
]);

export function normalizeUrl(
    input: string,
    options: NormalizeUrlOptions = DEFAULT_OPTIONS,
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let value = input.trim();

    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
    }

    const url = new URL(value);

    if (!opts.allowedProtocols!.includes(url.protocol)) {
        throw new Error("Unsupported protocol");
    }

    url.protocol = url.protocol.toLowerCase();

    url.hostname = domainToASCII(url.hostname.toLowerCase());

    if (
        (url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")
    ) {
        url.port = "";
    }

    url.hash = "";

    let pathname = decodeURIComponent(url.pathname);

    pathname = path.posix.normalize(pathname);

    pathname = pathname.replace(/\/{2,}/g, "/");

    if (
        opts.removeTrailingSlash &&
        pathname.length > 1 &&
        pathname.endsWith("/")
    ) {
        pathname = pathname.slice(0, -1);
    }

    url.pathname = pathname;

    const params = new URLSearchParams();

    const entries = [...url.searchParams.entries()]
        .filter(([key]) => {
            if (!opts.removeTrackingParams) return true;

            return !TRACKING_PARAMS.has(key.toLowerCase());
        })
        .sort(([a], [b]) => a.localeCompare(b));

    const seen = new Set<string>();

    for (const [key, value] of entries) {
        if (opts.removeDuplicateQueryParams) {
            const id = `${key}:${value}`;

            if (seen.has(id)) continue;

            seen.add(id);
        }

        params.append(key, value);
    }

    url.search = params.toString();

    return url.toString();
}