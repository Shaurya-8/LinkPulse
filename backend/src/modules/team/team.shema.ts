import { z } from 'zod';

const TEAM_ROLE_VALUES = ['ADMIN', 'EDITOR', 'VIEWER'] as const;

const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Team name must be at least 2 characters').max(80),
    slug: slugSchema.optional(),
    description: z.string().max(500).optional(),
  }),
});

export const updateTeamSchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(500).nullable().optional(),
  }),
});

export const inviteMemberSchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
    role: z.enum(TEAM_ROLE_VALUES).default('VIEWER'),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    teamId: z.string().cuid(),
    memberId: z.string().cuid(),
  }),
  body: z.object({
    role: z.enum(TEAM_ROLE_VALUES),
  }),
});

export const acceptInvitationSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

export const teamIdParamSchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
});

export const memberIdParamSchema = z.object({
  params: z.object({
    teamId: z.string().cuid(),
    memberId: z.string().cuid(),
  }),
});

export const invitationIdParamSchema = z.object({
  params: z.object({
    teamId: z.string().cuid(),
    invitationId: z.string().cuid(),
  }),
});

export const teamLinksQuerySchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['createdAt', 'clickCount', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const teamAnalyticsQuerySchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
  query: z.object({
    period: z.enum(['24h', '7d', '30d', '90d', 'all']).default('7d'),
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>['body'];
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>['body'];
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>['body'];