import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { Policy } from './types.js';
import type { RateLimitService as RateLimitServiceType } from './LimiterService.js';

// Mock client config
jest.unstable_mockModule('../../config/redis.js', () => ({
  client: {},
}));

const { RateLimitService } = await import('./LimiterService.js');
const { limiter } = await import('./index.js');

// Mock rate-limiter-flexible
const mockConsume = jest.fn() as any;
jest.mock('rate-limiter-flexible', () => {
  return {
    RateLimiterRedis: jest.fn().mockImplementation((options: any) => {
      return {
        consume: mockConsume,
        points: options.points,
      };
    }),
    RateLimiterRes: class RateLimiterRes {
      remainingPoints: number;
      msBeforeNext: number;
      constructor(remainingPoints: number, msBeforeNext: number) {
        this.remainingPoints = remainingPoints;
        this.msBeforeNext = msBeforeNext;
      }
    },
  };
});

describe('RateLimitService', () => {
  let service: RateLimitServiceType;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RateLimitService();
  });

  describe('getLimiter', () => {
    it('should create and cache a RateLimiterRedis instance', () => {
      const options = { points: 10, duration: 60, keyPrefix: 'test', blockDuration: 60 };
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

      const policy1: Policy = {
        name: 'test-policy-1',
        limiter: { points: 10, duration: 60, keyPrefix: 'test', blockDuration: 60 },
        key: () => 'user123',
      };

      const req = {} as Request;
      const headers: Record<string, string | number> = {};
      const res = {
        locals: {},
        setHeader(name: string, value: string | number) {
          headers[name] = value;
        },
      } as unknown as Response;
      const next = jest.fn();

      const middleware = limiter([policy1]);
      await middleware(req, res, next);

      expect(mockConsume).toHaveBeenCalledWith('user123');
      expect(headers['X-RateLimit-Limit']).toBe(10);
      expect(headers['X-RateLimit-Remaining']).toBe(8);
      expect(headers['X-RateLimit-Reset']).toBe(2); // 2000 ms / 1000 = 2 seconds
      expect(next).toHaveBeenCalled();
    });

    it('should skip policy execution if policy.skip is true', async () => {
      const policy1: Policy = {
        name: 'test-policy-2',
        limiter: { points: 10, duration: 60, keyPrefix: 'test', blockDuration: 60 },
        key: () => 'user123',
        skip: () => true,
      };

      const req = {} as Request;
      const res = {
        locals: {},
        setHeader: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      const middleware = limiter([policy1]);
      await middleware(req, res, next);

      expect(mockConsume).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
