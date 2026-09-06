import { BadRequestError } from "../errors/AppError";

export function normalizeUrl(input: string): string {
    if (!/^https?:\/\//i.test(input.trim())) {
        input = `https://${input.trim()}`;
    }

    const url = new URL(input);

    // Normalize hostname
    url.hostname = url.hostname.toLowerCase();

    return url.toString();
}

export function validateUrl(input: string): void {

    const url = new URL(input);

    if (!["http:", "https:"].includes(url.protocol)) {
        throw new BadRequestError("Only 'http' and 'https' are allowed");
    }
    if (url.hostname === "localhost") {
        throw new BadRequestError("localhost not allowed")

    }

    const host = url.hostname.toLocaleLowerCase();

    if (host === "::1" || host === "[::1]" || host.startsWith("127.")) {
        throw new Error("Loopback addresses are not allowed");
    }

    if (
        host.startsWith("10.") ||
        host.startsWith("192.168.")
    ) {
        throw new Error("Private addresses are not allowed");
    }

    // Your own domain
    if (host === "short.ly") {
        throw new Error("Cannot shorten URLs from this domain");
    }

}