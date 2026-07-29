import { describe, it, expect } from '@jest/globals';
import { Request } from 'express';
import { RateLimitKeys } from './key.js';

describe('RateLimitKeys helper', () => {
  describe('ip', () => {
    it('should resolve IP from x-forwarded-for string', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        },
      } as unknown as Request;
      expect(RateLimitKeys.ip(mockReq)).toBe('192.168.1.100');
    });

    it('should resolve IP from x-forwarded-for array', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': [' 10.0.0.2 ', ' 10.0.0.1 '],
        },
      } as unknown as Request;
      expect(RateLimitKeys.ip(mockReq)).toBe('10.0.0.2');
    });

    it('should fallback to req.ip', () => {
      const mockReq = {
        headers: {},
        ip: '172.16.0.1',
      } as unknown as Request;
      expect(RateLimitKeys.ip(mockReq)).toBe('172.16.0.1');
    });

    it('should fallback to remote address if no header or ip property', () => {
      const mockReq = {
        headers: {},
        socket: {
          remoteAddress: '10.10.10.10',
        },
      } as unknown as Request;
      expect(RateLimitKeys.ip(mockReq)).toBe('10.10.10.10');
    });

    it('should return "unknown" if nothing is found', () => {
      const mockReq = {
        headers: {},
        socket: {},
      } as unknown as Request;
      expect(RateLimitKeys.ip(mockReq)).toBe('unknown');
    });
  });

  describe('email', () => {
    it('should extract and format email', () => {
      const mockReq = {
        body: {
          email: '  TestUser@Example.Com  ',
        },
      } as unknown as Request;
      expect(RateLimitKeys.email(mockReq)).toBe('testuser@example.com');
    });

    it('should return empty string if no email', () => {
      const mockReq = {
        body: {},
      } as unknown as Request;
      expect(RateLimitKeys.email(mockReq)).toBe('');
    });
  });

  describe('emailIp', () => {
    it('should combine email and IP', () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
        },
        ip: '192.168.0.1',
        headers: {},
      } as unknown as Request;
      expect(RateLimitKeys.emailIp(mockReq)).toBe('test@example.com:192.168.0.1');
    });
  });

  describe('requestId', () => {
    it('should extract requestId', () => {
      const mockReq = {
        body: {
          requestId: 'req-123456',
        },
      } as unknown as Request;
      expect(RateLimitKeys.requestId(mockReq)).toBe('req-123456');
    });
  });

  describe('userId', () => {
    it('should extract userId from authenticated request', () => {
      const mockReq = {
        user: {
          id: 'user-789',
        },
      } as unknown as Request;
      expect(RateLimitKeys.userId(mockReq)).toBe('user-789');
    });
  });

  describe('apiKey', () => {
    it('should extract apiKey from header', () => {
      const mockReq = {
        headers: {
          'x-api-key': 'key-abc-123',
        },
      } as unknown as Request;
      expect(RateLimitKeys.apiKey(mockReq)).toBe('key-abc-123');
    });
  });
});
