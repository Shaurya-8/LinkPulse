import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/auth.middleware.js';
import { UnauthorizedError } from '../../src/common/errors/AppError.js';
import { verifyToken } from '../../src/common/utils/jwt.js';
import { cache } from '../../src/config/redis.js';
import { SessionsRepository } from '../../src/modules/auth/session/session.repository.js';

// Mock dependency modules
jest.mock('../../src/common/utils/cookies.js', () => ({
  extractAccessToken: jest.fn((req: any) => req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1]),
}));

jest.mock('../../src/common/utils/jwt.js', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../src/config/redis.js', () => ({
  cache: {
    exists: jest.fn(),
  },
  cacheKeys: {
    revokedAccessToken: (jti: string) => `revoked:access:${jti}`,
  },
}));

jest.mock('../../src/modules/auth/session/session.repository.js', () => {
  return {
    SessionsRepository: jest.fn().mockImplementation(() => {
      return {
        getByAccessJti: jest.fn(),
        updateLastUsed: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

jest.mock('../../src/config/prisma.js', () => ({
  prisma: {},
}));

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      cookies: {},
      headers: {},
    };
    mockRes = {};
    next = jest.fn();
  });

  it('should throw UnauthorizedError if token is missing', async () => {
    await authenticate(mockReq as Request, mockRes as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const calls = (next as any).mock.calls;
    expect(calls[0][0].message).toBe('Authentication required, please login.');
  });

  it('should throw UnauthorizedError if token is revoked in cache', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    
    const mockedVerifyToken = verifyToken as any;
    mockedVerifyToken.mockReturnValue({
      jti: 'token-jti',
      sub: 'user-id',
      email: 'test@example.com',
      role: 'USER',
    });

    const mockedCacheExists = cache.exists as any;
    mockedCacheExists.mockResolvedValue(true); // Token is revoked

    await authenticate(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const calls = (next as any).mock.calls;
    expect(calls[0][0].message).toBe('Token has been revoked. Please login again.');
  });

  it('should authorize request and populate req.user if token and session are valid', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    
    const mockedVerifyToken = verifyToken as any;
    mockedVerifyToken.mockReturnValue({
      jti: 'token-jti',
      sub: 'user-id',
      email: 'test@example.com',
      role: 'USER',
    });

    const mockedCacheExists = cache.exists as any;
    mockedCacheExists.mockResolvedValue(false); // Not revoked

    const mockSession = {
      id: 'session-id',
      isActive: true,
      refreshToken: 'refresh-token',
    };

    // Instantiate repo and mock getByAccessJti on its prototype
    const mockGetByAccessJti = jest.fn().mockResolvedValue(mockSession);
    const mockUpdateLastUsed = jest.fn().mockResolvedValue(true);
    
    const mockedSessionsRepository = SessionsRepository as any;
    mockedSessionsRepository.mockImplementation(() => {
      return {
        getByAccessJti: mockGetByAccessJti,
        updateLastUsed: mockUpdateLastUsed,
      };
    });

    await authenticate(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
    expect((mockReq as any).user).toEqual({
      sub: 'user-id',
      email: 'test@example.com',
      refreshToken: 'refresh-token',
      sessionId: 'session-id',
      role: 'USER',
    });
  });
});
