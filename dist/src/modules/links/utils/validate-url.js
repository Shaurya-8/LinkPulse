import net from "node:net";
import { domainToASCII } from "node:url";
import ipaddr from "ipaddr.js";
import { UrlValidationError } from "../../../common/errors/AppError";
const DEFAULT_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTS = new Set([
    "localhost",
    "localhost.localdomain",
]);
const BLOCKED_TLDS = new Set([
    "local",
    "internal",
]);
const MAX_URL_LENGTH = 2048;
const MIN_HOST_LENGTH = 3;
const DEFAULT_OPTIONS = {
    allowHttp: true,
    allowLocalhost: false,
    allowPrivateIp: false,
    maxLength: 2048,
};
export async function validateUrl(input, options = DEFAULT_OPTIONS) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!input || typeof input !== "string") {
        throw new UrlValidationError("URL is required.");
    }
    let value = input.trim();
    if (value.length === 0) {
        throw new UrlValidationError("URL cannot be empty.");
    }
    if (value.length > opts.maxLength) {
        throw new UrlValidationError("URL exceeds maximum length.");
    }
    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
    }
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new UrlValidationError("Invalid URL.");
    }
    if (!DEFAULT_PROTOCOLS.has(url.protocol)) {
        throw new UrlValidationError("Unsupported protocol.");
    }
    if (!opts.allowHttp && url.protocol === "http:") {
        throw new UrlValidationError("HTTP URLs are not allowed.");
    }
    url.hostname = domainToASCII(url.hostname);
    if (!url.hostname) {
        throw new UrlValidationError("Invalid hostname.");
    }
    if (url.hostname.length < MIN_HOST_LENGTH) {
        throw new UrlValidationError("Hostname is too short.");
    }
    if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
        throw new UrlValidationError("Localhost URLs are not allowed.");
    }
    const tld = url.hostname.split(".").pop()?.toLowerCase();
    if (tld && BLOCKED_TLDS.has(tld)) {
        throw new UrlValidationError("Invalid top-level domain.");
    }
    if (!opts.allowPrivateIp && net.isIP(url.hostname)) {
        if (isPrivateIp(url.hostname)) {
            throw new UrlValidationError("Private IP addresses are not allowed.");
        }
    }
    if (url.username || url.password) {
        throw new UrlValidationError("Credentials in URL are not allowed.");
    }
    if (url.port) {
        const port = Number(url.port);
        if (port < 1 || port > 65535) {
            throw new UrlValidationError("Invalid port.");
        }
    }
    return url;
}
export function isPrivateIp(ip) {
    try {
        const addr = ipaddr.parse(ip);
        const range = addr.range();
        return [
            "loopback",
            "private",
            "linkLocal",
            "uniqueLocal",
            "carrierGradeNat",
            "unspecified",
            "broadcast",
            "multicast",
            "reserved",
        ].includes(range);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=validate-url.js.map