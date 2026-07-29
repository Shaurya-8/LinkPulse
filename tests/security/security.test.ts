import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { rateLimit } from '../../src/middleware/rate-limiter.middleware.js';

// Mock Redis connection and actions
jest.mock('../../src/config/redis.js', () => {
  return {
    client: {
      ping: jest.fn().mockResolvedValue('PONG'),
      eval: jest.fn().mockResolvedValue([1, 1, 99, 60]), // [allowed, current, remaining, reset]
      quit: jest.fn().mockResolvedValue(true),
    },
    redisClient: {
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(true),
    },
    redisHealthCheck: jest.fn().mockResolvedValue(true),
    connectRedis: jest.fn().mockResolvedValue(undefined),
    disconnectRedis: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock BullMQ Queue and jobs
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: jest.fn().mockResolvedValue({}),
        getWaitingCount: jest.fn().mockResolvedValue(0),
        getActiveCount: jest.fn().mockResolvedValue(0),
        getCompletedCount: jest.fn().mockResolvedValue(0),
        getFailedCount: jest.fn().mockResolvedValue(0),
      };
    }),
  };
});

jest.mock('../../src/middleware/rate-limiter.middleware.js', () => {
  return {
    rateLimit: jest.fn().mockResolvedValue({
      allowed: true,
      current: 1,
      remaining: 99,
      resetInSeconds: 60,
    }),
    globalRateLimiter: () => (req: any, res: any, next: any) => next(),
    loginRateLimiter: () => (req: any, res: any, next: any) => next(),
    otpRateLimiter: () => (req: any, res: any, next: any) => next(),
    registerRateLimiter: () => (req: any, res: any, next: any) => next(),
    passwordResetRateLimiter: () => (req: any, res: any, next: any) => next(),
    progressiveDelay: () => (req: any, res: any, next: any) => next(),
  };
});

describe('Security Testing', () => {
  describe('Helmet / Security Headers', () => {
    it('should assert important security headers are present in response', async () => {
      const app = await createApp();
      const response = await request(app).get('/health');

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });
  });

  describe('CORS policy validation', () => {
    it('should reject unauthorized origins', async () => {
      const app = await createApp();
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.status).toBe(500); // Express CORS error triggers next(err), resulting in 500
      expect(response.text).toContain('CORS policy violation');
    });
  });

  describe('SQL Injection Prevention (Input Validation)', () => {
    it('should reject SQL Injection attempts in email parameter', async () => {
      const app = await createApp();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "' OR '1'='1' --",
          password: 'Password123!',
        })
        .expect(400); // Rejected by Zod validation

      expect(response.body.success).toBe(false);
    });
  });
});
