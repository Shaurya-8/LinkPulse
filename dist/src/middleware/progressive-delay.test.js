import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { progressiveDelay } from './rate-limiter.middleware.js';
describe('progressiveDelay middleware', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });
    it('should call next immediately if current requests is <= threshold', () => {
        const middleware = progressiveDelay({ threshold: 3, baseDelay: 500 });
        const req = { headers: {} };
        const res = {
            locals: {
                rateLimit: {
                    current: 2,
                },
            },
        };
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        const spySetTimeout = jest.spyOn(global, 'setTimeout');
        middleware(req, res, next);
        expect(spySetTimeout).not.toHaveBeenCalled();
        expect(nextCalled).toBe(true);
    });
    it('should call next immediately if rateLimit info is missing', () => {
        const middleware = progressiveDelay();
        const req = { headers: {} };
        const res = {
            locals: {},
        };
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        middleware(req, res, next);
        expect(nextCalled).toBe(true);
    });
    it('should delay next() using exponent logic if current requests > threshold', () => {
        const middleware = progressiveDelay({ threshold: 3, baseDelay: 500, maxDelay: 5000 });
        const req = { headers: {} };
        // For current = 4: exponent = 4 - 3 = 1.
        // delay = baseDelay * 2^(exponent - 1) = 500 * 2^0 = 500ms
        const res = {
            locals: {
                rateLimit: {
                    current: 4,
                },
            },
        };
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        const spySetTimeout = jest.spyOn(global, 'setTimeout');
        middleware(req, res, next);
        expect(spySetTimeout).toHaveBeenCalled();
        expect(nextCalled).toBe(false);
        // Advance time by 499ms
        jest.advanceTimersByTime(499);
        expect(nextCalled).toBe(false);
        // Advance remaining 1ms
        jest.advanceTimersByTime(1);
        expect(nextCalled).toBe(true);
    });
    it('should respect maxDelay cap', () => {
        const middleware = progressiveDelay({ threshold: 3, baseDelay: 500, maxDelay: 2000 });
        const req = { headers: {} };
        // For current = 10: exponent = 10 - 3 = 7.
        // delay = 500 * 2^6 = 32000ms, capped at maxDelay = 2000ms
        const res = {
            locals: {
                rateLimit: {
                    current: 10,
                },
            },
        };
        let nextCalled = false;
        const next = () => {
            nextCalled = true;
        };
        middleware(req, res, next);
        jest.advanceTimersByTime(1999);
        expect(nextCalled).toBe(false);
        jest.advanceTimersByTime(1);
        expect(nextCalled).toBe(true);
    });
});
//# sourceMappingURL=progressive-delay.test.js.map