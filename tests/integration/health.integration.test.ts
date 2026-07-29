import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';

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

describe('GET /health Integration', () => {
  it('should return health status OK and queue details', async () => {
    const app = await createApp();
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('queues');
  });
});
