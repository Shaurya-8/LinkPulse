import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Define shared mocks before module imports so that constructor returns them
const mockGetByAccessJti = jest.fn<any>();
const mockUpdateLastUsed = jest.fn<any>();

// Mock dependency modules
jest.unstable_mockModule('../../src/common/utils/cookies.js', () => ({
  __esModule: true,
  extractAccessToken: jest.fn((req: any) => req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1]),
}));

jest.unstable_mockModule('../../src/common/utils/jwt.js', () => ({
  __esModule: true,
  verifyToken: jest.fn(),
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  __esModule: true,
  cache: {
    exists: jest.fn(),
  },
  cacheKeys: {
    revokedAccessToken: (jti: string) => `revoked:access:${jti}`,
  },
}));

jest.unstable_mockModule('../../src/modules/auth/session/session.repository.js', () => {
  return {
    __esModule: true,
    SessionsRepository: jest.fn().mockImplementation(() => {
      return {
        getByAccessJti: mockGetByAccessJti,
        updateLastUsed: mockUpdateLastUsed,
      };
    }),
  };
});

jest.unstable_mockModule('../../src/config/prisma.js', () => ({
  __esModule: true,
  prisma: {},
}));

// Dynamically import the modules AFTER registering the mocks using top-level await
const { authenticate } = await import('../../src/middleware/auth.middleware.js');
const { UnauthorizedError } = await import('../../src/common/errors/AppError.js');
const { verifyToken } = await import('../../src/common/utils/jwt.js');
const { cache } = await import('../../src/config/redis.js');
const { SessionsRepository } = await import('../../src/modules/auth/session/session.repository.js');

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

    // Configure mock session repo methods
    mockGetByAccessJti.mockResolvedValue(mockSession);
    mockUpdateLastUsed.mockResolvedValue(true);

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
