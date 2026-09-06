import { Request, Response, NextFunction } from "express";
import { extractAccessToken } from "../common/utils/cookies";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../common/errors/AppError";
import { config } from "../config";
import { verifyToken } from "../common/utils/jwt";
import { AuthenticatedRequest } from "../types";
import { RefreshToken, SessionId, UserId } from "../types";
import { JwtAccessPayload } from "../types";
import { cache, cacheKeys } from "../config/redis";
import { SessionsRepository } from "../modules/auth/session/session.repository";
import { prisma } from "../config/prisma";
import { logger } from "../common/utils/logger";
import { PlanType } from "../../generated/prisma/enums";

const sessionRepository = new SessionsRepository(prisma);

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const rawToken = extractAccessToken(req as any);
        if (!rawToken) {
            throw new UnauthorizedError('Authentication required, please login.');
        }

        const payload = verifyToken<JwtAccessPayload>(rawToken, config.jwt.accessSecret, 'api');

        const isRevoked = await cache.exists(cacheKeys.revokedAccessToken(payload.jti));
        if (isRevoked) {
            throw new UnauthorizedError('Token has been revoked. Please login again.');
        }

        const session = await sessionRepository.getByAccessJti(payload.jti);
        if (!session || !session.isActive) {
            throw new UnauthorizedError('Session is inactive or does not exist. Please login again.');
        }

        sessionRepository.updateLastUsed(session.id)
            .catch(err => {
                logger.warn('Failed to update session last used timestamp:', err);
            });

        (req as AuthenticatedRequest).user = {
            sub: payload.sub as UserId,
            email: payload.email,
            refreshToken: session.refreshToken as RefreshToken,
            sessionId: session.id as SessionId,
            role: payload.role,
            planType: payload.planType 
        };

        next();
    } catch (err) {
        next(err);

    }
}

export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
    const rawToken = extractAccessToken(req as any);
    if (!rawToken) {
        return next();
    }
    try {
        await authenticate(req, res, next);
    } catch (err) {
        next(err);
    }
}

// import { Response, NextFunction } from 'express';
// import { prisma } from '../config/database';
// import { redis } from '../config/redis';
// import { sendForbidden, sendNotFound, sendUnauthorized } from '../utils/response';
import { hasTeamPermission, TeamRole } from '../types/enums';
import { TeamAuthenticatedRequest } from '../types';

const TEAM_CONTEXT_TTL = 60; // seconds

function teamContextCacheKey(teamId: string, userId: UserId): string {
  return `team_ctx:${teamId}:${userId}`;
}

/**
 * Middleware factory: resolves the team context and checks role.
 *
 * Usage:
 *   router.get('/:teamId/members', authenticate, requireTeamRole('VIEWER'), handler)
 *
 * @param minimumRole  The lowest TeamRole that has access (ADMIN > EDITOR > VIEWER).
 *                     Owners always have access regardless of their stored role.
 */
export function requireTeamRole(minimumRole: TeamRole) {
  return async (
    req: TeamAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('user');
    }

    const teamId  = req.params.teamId as string;
    const userId = req.user.sub as UserId;

    if (!teamId) {
      throw new NotFoundError('Team');
    }

    try {
      // Try cache first
      const cacheKey = teamContextCacheKey(teamId, userId);
      const cached = await cache.get(cacheKey);

      let teamContext: TeamAuthenticatedRequest['teamContext'];

      if (cached) {
        teamContext = JSON.parse(cached) as NonNullable<TeamAuthenticatedRequest['teamContext']>;
      } else {
        // Fetch team and membership together
        const team = await prisma.teams.findUnique({
          where: { id: teamId },
          select: { id: true, name: true, slug: true, ownerId: true },
        });

        if (!team) {
          throw new NotFoundError('Team');
        //   return;
        }

        const isOwner = team.ownerId === userId;
        let role: TeamRole | null = null;

        if (isOwner) {
          // Owners always have ADMIN-level access
          role = TeamRole.ADMIN;
        } else {
          const membership = await prisma.teamMembers.findUnique({
            where: { teamId_userId: { teamId, userId } },
            select: { role: true },
          });
          if (membership) {
            role = membership.role as TeamRole;
          }
        }

        if (!role) {
          throw new ForbiddenError('You are not a member of this team');
          return;
        }

        teamContext = {
          teamId,
          userId,
          role,
          isOwner,
          team: { id: team.id, name: team.name, slug: team.slug },
        };

        // Cache for 60 seconds
        await cache.set(cacheKey,teamContext, TEAM_CONTEXT_TTL );
      }

      // Check permission hierarchy
      if (!hasTeamPermission(teamContext.role as TeamRole, minimumRole)) {
        throw new ForbiddenError(`This action requires ${minimumRole} role or higher`);
      }

      req.teamContext = teamContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Invalidate the team context cache for a specific user in a team.
 * Call after role changes or member removal.
 */
export async function invalidateTeamContext(teamId: string, userId: UserId): Promise<void> {
  await cache.del(teamContextCacheKey(teamId, userId));
}

/**
 * Invalidate ALL team context cache entries for a team (e.g. when team is deleted).
 */
export async function invalidateAllTeamContexts(teamId: string): Promise<void> {
  const keys = await cache.keys(`team_ctx:${teamId}:*`);
  if (keys.length > 0) await cache.del(...keys);
}

export async function requirePremium(req: Request, res: Response, next: NextFunction) {

    const user = (req as AuthenticatedRequest).user;
    if (user.planType === PlanType.FREE) {
        throw new BadRequestError('Feature Require subscription');
    }
    next();
}