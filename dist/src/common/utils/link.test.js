import { describe, it, expect } from '@jest/globals';
import { normalizeUrl, validateUrl } from './link.js'; // Note .js extension is required for relative ESM paths in ts-jest ESM mode
import { BadRequestError } from '../errors/AppError.js';
describe('link.ts utilities', () => {
    describe('normalizeUrl', () => {
        it('should prepend https:// if missing', () => {
            expect(normalizeUrl('google.com')).toBe('https://google.com/');
        });
        it('should keep http:// if present', () => {
            expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
        });
        it('should keep https:// if present', () => {
            expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
        });
        it('should lowercase the hostname', () => {
            expect(normalizeUrl('HTTPS://EXAMPLE.COM/PATH')).toBe('https://example.com/PATH');
        });
    });
    describe('validateUrl', () => {
        it('should allow valid http/https URLs', () => {
            expect(() => validateUrl('https://google.com')).not.toThrow();
            expect(() => validateUrl('http://github.com/path')).not.toThrow();
        });
        it('should throw BadRequestError if protocol is not http or https', () => {
            expect(() => validateUrl('ftp://google.com')).toThrow(BadRequestError);
            expect(() => validateUrl('mailto:test@example.com')).toThrow(BadRequestError);
        });
        it('should throw BadRequestError for localhost', () => {
            expect(() => validateUrl('http://localhost')).toThrow(BadRequestError);
            expect(() => validateUrl('https://localhost:8000')).toThrow(BadRequestError);
        });
        it('should throw Error for loopback addresses', () => {
            expect(() => validateUrl('http://127.0.0.1')).toThrow('Loopback addresses are not allowed');
            expect(() => validateUrl('http://[::1]')).toThrow('Loopback addresses are not allowed');
        });
        it('should throw Error for private addresses', () => {
            expect(() => validateUrl('http://192.168.1.1')).toThrow('Private addresses are not allowed');
            expect(() => validateUrl('http://10.0.0.1')).toThrow('Private addresses are not allowed');
        });
        it('should throw Error for own domain', () => {
            expect(() => validateUrl('https://short.ly/xyz')).toThrow('Cannot shorten URLs from this domain');
        });
    });
});
//# sourceMappingURL=link.test.js.map