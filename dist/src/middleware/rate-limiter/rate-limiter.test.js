import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RateLimitService } from './index.js';
// Mock client config
jest.mock('../../config/redis.js', () => ({
    client: {},
}));
// Mock rate-limiter-flexible
const mockConsume = jest.fn();
jest.mock('rate-limiter-flexible', () => {
    return {
        RateLimiterRedis: jest.fn().mockImplementation((options) => {
            return {
                consume: mockConsume,
                points: options.points,
            };
        }),
        RateLimiterRes: class RateLimiterRes {
            remainingPoints;
            msBeforeNext;
            constructor(remainingPoints, msBeforeNext) {
                this.remainingPoints = remainingPoints;
                this.msBeforeNext = msBeforeNext;
            }
        },
    };
});
describe('RateLimitService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new RateLimitService();
    });
    describe('getLimiter', () => {
        it('should create and cache a RateLimiterRedis instance', () => {
            const options = { points: 10, duration: 60 };
            const limiter1 = service.getLimiter(options);
            const limiter2 = service.getLimiter(options);
            expect(limiter1).toBe(limiter2); // Cached Map check
        });
    });
    describe('limiter middleware', () => {
        it('should consume policies and call next() with rate limit headers', async () => {
            mockConsume.mockResolvedValue({
                remainingPoints: 8,
                msBeforeNext: 2000,
            });
            const policy1 = {
                limiter: { points: 10, duration: 60 },
                key: () => 'user123',
            };
            const req = {};
            const headers = {};
            const res = {
                setHeader(name, value) {
                    headers[name] = value;
                },
            };
            const next = jest.fn();
            const middleware = service.limiter([policy1]);
            await middleware(req, res, next);
            expect(mockConsume).toHaveBeenCalledWith('user123');
            expect(headers['X-RateLimit-Limit']).toBe(10);
            expect(headers['X-RateLimit-Remaining']).toBe(8);
            expect(headers['X-RateLimit-Reset']).toBe(2); // 2000 ms / 1000 = 2 seconds
            expect(next).toHaveBeenCalled();
        });
        it('should skip policy execution if policy.skip is true', async () => {
            const policy1 = {
                limiter: { points: 10, duration: 60 },
                key: () => 'user123',
                skip: true,
            };
            const req = {};
            const res = {
                setHeader: jest.fn(),
            };
            const next = jest.fn();
            const middleware = service.limiter([policy1]);
            await middleware(req, res, next);
            expect(mockConsume).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=rate-limiter.test.js.map