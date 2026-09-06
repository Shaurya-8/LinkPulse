import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { enqueueEmail } from '../../jobs/queues';
import { AppError } from '../../middleware/error.middleware';
import { invalidateTeamContext, invalidateAllTeamContexts } from '../../middleware/team-auth.middleware';
import { TeamRole } from '../../types/enums';
import { buildPaginationMeta } from '../../utils/response';
import {
  TeamWithStats, TeamMemberWithUser, TeamAnalyticsSummary,
} from '../../types';
import type { CreateTeamInput, UpdateTeamInput } from './teams.schema';

const INVITATION_TTL_DAYS = 7;
const MAX_TEAMS_PER_USER = 10;
const MAX_MEMBERS_PER_TEAM = 50;

// ─────────────────────────────────────────────
// Slug utilities
// ─────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await prisma.team.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${suffix++}`;
  }
}

// ─────────────────────────────────────────────
// Email template
// ─────────────────────────────────────────────

function buildInvitationEmail(
  inviterName: string,
  teamName: string,
  role: string,
  inviteUrl: string,
): { subject: string; html: string } {
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
  return {
    subject: `You've been invited to join ${teamName} on LinkSnap`,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .header { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 40px; text-align:center; }
  .header h1 { color:#fff; font-size:24px; font-weight:700; }
  .body { padding:40px; }
  .body h2 { font-size:20px; color:#111827; margin-bottom:12px; }
  .body p { font-size:15px; color:#4b5563; line-height:1.6; margin-bottom:16px; }
  .role-badge { display:inline-block; background:#ede9fe; color:#6d28d9; padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; margin-bottom:16px; }
  .btn { display:inline-block; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff!important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:600; margin:8px 0 24px; }
  .footer { background:#f9fafb; padding:24px 40px; text-align:center; font-size:13px; color:#9ca3af; }
  .warning { background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:0 8px 8px 0; font-size:13px; color:#92400e; }
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>🔗 LinkSnap</h1><p style="color:rgba(255,255,255,.8);margin-top:6px">Team Invitation</p></div>
  <div class="body">
    <h2>You're invited to join a team</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on LinkSnap.</p>
    <span class="role-badge">${roleLabel} Role</span>
    <p>As a <strong>${roleLabel}</strong>, you will be able to ${role === 'ADMIN' ? 'manage the team, invite members, and' : role === 'EDITOR' ? 'create and edit links and' : 'view links and'} access team analytics.</p>
    <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    <p>Or paste this link in your browser:</p>
    <p style="word-break:break-all;color:#6366f1;font-size:13px;">${inviteUrl}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p class="warning">This invitation expires in <strong>${INVITATION_TTL_DAYS} days</strong>. If you don't have a LinkSnap account, you'll need to create one first.</p>
  </div>
  <div class="footer"><p>© ${new Date().getFullYear()} LinkSnap. All rights reserved.</p></div>
</div></body></html>`,
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export class TeamsService {
  // ── Create ────────────────────────────────────────────────────────────────

  async createTeam(input: CreateTeamInput, ownerId: string): Promise<object> {
    const count = await prisma.team.count({ where: { ownerId } });
    if (count >= MAX_TEAMS_PER_USER) {
      throw new AppError(400, `Maximum ${MAX_TEAMS_PER_USER} teams per user`);
    }

    const baseSlug = input.slug ?? slugify(input.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const team = await prisma.team.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        ownerId,
        members: {
          create: { userId: ownerId, role: 'ADMIN' as never },
        },
      },
      include: { _count: { select: { members: true, links: true } } },
    });

    return this.formatTeam(team, ownerId, team._count.members, team._count.links);
  }

  // ── List user's teams ─────────────────────────────────────────────────────

  async getUserTeams(userId: string): Promise<TeamWithStats[]> {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: { _count: { select: { members: true, links: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    type MemberRow = { role: string; team: { id: string; name: string; slug: string; description: string | null; logo: string | null; ownerId: string; createdAt: Date; _count: { members: number; links: number } } };
    return (memberships as MemberRow[]).map((m) =>
      this.formatTeam(m.team, userId, m.team._count.members, m.team._count.links, m.role),
    );
  }

  // ── Get single team ───────────────────────────────────────────────────────

  async getTeamById(teamId: string, userId: string): Promise<object> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { _count: { select: { members: true, links: true } } },
    });
    if (!team) throw new AppError(404, 'Team not found');

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });

    const role = team.ownerId === userId ? TeamRole.ADMIN : (membership?.role as TeamRole | undefined);
    if (!role) throw new AppError(403, 'You are not a member of this team');

    return this.formatTeam(team, userId, team._count.members, team._count.links, role);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateTeam(teamId: string, input: UpdateTeamInput): Promise<object> {
    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.slug) {
      const uniqueSlug = await ensureUniqueSlug(input.slug, teamId);
      data.slug = uniqueSlug;
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data,
      include: { _count: { select: { members: true, links: true } } },
    });

    await invalidateAllTeamContexts(teamId);
    return team;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });
    if (!team) throw new AppError(404, 'Team not found');
    if (team.ownerId !== userId) {
      throw new AppError(403, 'Only the team owner can delete a team');
    }

    // Unlink team links (don't delete them, just remove teamId)
    await prisma.link.updateMany({ where: { teamId }, data: { teamId: null } });
    await prisma.team.delete({ where: { id: teamId } });
    await invalidateAllTeamContexts(teamId);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async getMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true, email: true, username: true,
            firstName: true, lastName: true, avatar: true,
          },
        },
        inviter: { select: { id: true, username: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m: { id: string; teamId: string; userId: string; role: string; joinedAt: Date; user: { id: string; email: string; username: string; firstName: string | null; lastName: string | null; avatar: string | null }; inviter: { id: string; username: string } | null }) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      role: m.role,
      isOwner: m.userId === team?.ownerId,
      joinedAt: m.joinedAt,
      user: m.user,
      inviter: m.inviter,
    })) as TeamMemberWithUser[];
  }

  // ── Invite member ─────────────────────────────────────────────────────────

  async inviteMember(
    teamId: string,
    email: string,
    role: string,
    invitedBy: string,
  ): Promise<{ message: string }> {
    const [team, memberCount] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        include: { owner: { select: { firstName: true, username: true } } },
      }),
      prisma.teamMember.count({ where: { teamId } }),
    ]);

    if (!team) throw new AppError(404, 'Team not found');
    if (memberCount >= MAX_MEMBERS_PER_TEAM) {
      throw new AppError(400, `Teams are limited to ${MAX_MEMBERS_PER_TEAM} members`);
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const alreadyMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw new AppError(409, 'This user is already a member of the team');
      }
    }

    // Expire any previous pending invitation for this email
    await prisma.teamInvitation.deleteMany({
      where: { teamId, email, acceptedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const inviterName =
      team.owner.firstName ?? team.owner.username;

    await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role: role as never,
        tokenHash,
        invitedBy,
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const inviteUrl = `${env.FRONTEND_URL}/accept-invitation/${rawToken}`;
    const emailContent = buildInvitationEmail(inviterName, team.name, role, inviteUrl);
    await enqueueEmail({ to: email, ...emailContent });

    return { message: `Invitation sent to ${email}` };
  }

  // ── Accept invitation ─────────────────────────────────────────────────────

  async acceptInvitation(token: string, userId: string): Promise<{ teamId: string; teamName: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await prisma.teamInvitation.findUnique({
      where: { tokenHash },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!invitation) throw new AppError(400, 'Invalid or expired invitation');
    if (invitation.acceptedAt) throw new AppError(400, 'This invitation has already been accepted');
    if (invitation.expiresAt < new Date()) throw new AppError(400, 'This invitation has expired');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== invitation.email) {
      throw new AppError(403, 'This invitation was sent to a different email address');
    }

    // Already a member?
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitation.teamId, userId } },
    });

    await prisma.$transaction([
      ...(existing
        ? []
        : [
            prisma.teamMember.create({
              data: {
                teamId: invitation.teamId,
                userId,
                role: invitation.role,
                invitedBy: invitation.invitedBy,
              },
            }),
          ]),
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return { teamId: invitation.teamId, teamName: invitation.team.name };
  }

  // ── Update member role ────────────────────────────────────────────────────

  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: string,
    requesterId: string,
  ): Promise<void> {
    const [team, member] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } }),
      prisma.teamMember.findUnique({ where: { id: memberId }, select: { userId: true, teamId: true } }),
    ]);

    if (!team || !member || member.teamId !== teamId) {
      throw new AppError(404, 'Member not found');
    }
    if (member.userId === team.ownerId) {
      throw new AppError(400, "Cannot change the team owner's role");
    }
    if (member.userId === requesterId) {
      throw new AppError(400, 'You cannot change your own role');
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: role as never },
    });

    await invalidateTeamContext(teamId, member.userId);
  }

  // ── Remove member ─────────────────────────────────────────────────────────

  async removeMember(teamId: string, memberId: string, _requesterId: string): Promise<void> {
    const [team, member] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } }),
      prisma.teamMember.findUnique({ where: { id: memberId }, select: { userId: true, teamId: true } }),
    ]);

    if (!team || !member || member.teamId !== teamId) {
      throw new AppError(404, 'Member not found');
    }
    if (member.userId === team.ownerId) {
      throw new AppError(400, 'Cannot remove the team owner');
    }

    await prisma.teamMember.delete({ where: { id: memberId } });
    await invalidateTeamContext(teamId, member.userId);
  }

  // ── Leave team ────────────────────────────────────────────────────────────

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });
    if (!team) throw new AppError(404, 'Team not found');
    if (team.ownerId === userId) {
      throw new AppError(400, 'The team owner cannot leave. Transfer ownership or delete the team.');
    }

    await prisma.teamMember.deleteMany({ where: { teamId, userId } });
    await invalidateTeamContext(teamId, userId);
  }

  // ── Pending invitations ───────────────────────────────────────────────────

  async getPendingInvitations(teamId: string): Promise<object[]> {
    return prisma.teamInvitation.findMany({
      where: { teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true, email: true, role: true, createdAt: true, expiresAt: true,
        inviter: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(teamId: string, invitationId: string): Promise<void> {
    const inv = await prisma.teamInvitation.findFirst({
      where: { id: invitationId, teamId },
    });
    if (!inv) throw new AppError(404, 'Invitation not found');
    await prisma.teamInvitation.delete({ where: { id: invitationId } });
  }

  // ── Team links ────────────────────────────────────────────────────────────

  async getTeamLinks(
    teamId: string,
    query: { page: number; limit: number; search?: string; sortBy: string; sortOrder: string },
  ): Promise<object> {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = {
      teamId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { shortCode: { contains: search, mode: 'insensitive' as const } },
          { originalUrl: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, links] = await Promise.all([
      prisma.link.count({ where }),
      prisma.link.findMany({
        where,
        include: {
          tags: true,
          user: { select: { id: true, username: true, firstName: true, avatar: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    const shortDomain = env.SHORT_DOMAIN;
    const formatted = (links as Array<Record<string, unknown>>).map((l: Record<string, unknown>) => ({
      id: l.id,
      shortCode: l.shortCode,
      shortUrl: `${shortDomain}/${l.shortCode}`,
      originalUrl: l.originalUrl,
      title: l.title,
      status: l.status,
      clickCount: l.clickCount,
      isPasswordProtected: !!l.passwordHash,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
      tags: l.tags,
      createdBy: l.user,
    }));

    return { links: formatted, meta: buildPaginationMeta(total, page, limit) };
  }

  // ── Team analytics ────────────────────────────────────────────────────────

  async getTeamAnalytics(teamId: string, period: string): Promise<TeamAnalyticsSummary> {
    const startDate = this.getPeriodStart(period);
    const dateFilter = startDate ? { clickedAt: { gte: startDate } } : {};

    const teamLinkFilter = { link: { teamId } };

    const [
      totalClicks, uniqueVisitorResult, totalLinks, activeLinks, memberCount,
      clicksThisWeek, clicksThisMonth, topLinksRaw,
    ] = await Promise.all([
      prisma.linkClick.count({ where: { isBot: false, ...teamLinkFilter, ...dateFilter } }),
      prisma.linkClick.groupBy({
        by: ['ipAddress'],
        where: { isBot: false, ipAddress: { not: null }, ...teamLinkFilter, ...dateFilter },
        _count: true,
      }),
      prisma.link.count({ where: { teamId } }),
      prisma.link.count({ where: { teamId, status: 'ACTIVE' as never } }),
      prisma.teamMember.count({ where: { teamId } }),
      prisma.linkClick.count({
        where: { isBot: false, ...teamLinkFilter, clickedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      prisma.linkClick.count({
        where: { isBot: false, ...teamLinkFilter, clickedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      prisma.link.findMany({
        where: { teamId },
        select: { id: true, shortCode: true, title: true, clickCount: true },
        orderBy: { clickCount: 'desc' },
        take: 5,
      }),
    ]);

    // Per-member stats: aggregate clicks for each member's team links
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, username: true, firstName: true } } },
    });

    const topMembers = await Promise.all(
      (members as Array<{ userId: string; user: { username: string; firstName: string | null } }>).map(async (m) => {
        const [linksCount, totalClicksForMember] = await Promise.all([
          prisma.link.count({ where: { teamId, userId: m.userId } }),
          prisma.linkClick.count({
            where: { isBot: false, link: { teamId, userId: m.userId } },
          }),
        ]);
        return {
          userId: m.userId,
          username: m.user.username,
          firstName: m.user.firstName,
          linksCount,
          totalClicks: totalClicksForMember,
        };
      }),
    );

    return {
      totalClicks,
      uniqueVisitors: uniqueVisitorResult.length,
      totalLinks,
      activeLinks,
      memberCount,
      clicksThisWeek,
      clicksThisMonth,
      topLinks: topLinksRaw,
      topMembers: topMembers.sort((a, b) => b.totalClicks - a.totalClicks).slice(0, 5),
    };
  }

  async getTeamTimeSeries(teamId: string, period: string): Promise<object[]> {
    const startDate = this.getPeriodStart(period) ?? new Date(Date.now() - 30 * 86400000);

    const clicks = await prisma.linkClick.findMany({
      where: {
        isBot: false,
        link: { teamId },
        clickedAt: { gte: startDate },
      },
      select: { clickedAt: true, ipAddress: true },
      orderBy: { clickedAt: 'asc' },
    });

    const grouped = new Map<string, { clicks: number; ips: Set<string | null> }>();
    for (const click of clicks) {
      const key = click.clickedAt.toISOString().slice(0, 10);
      const entry = grouped.get(key) ?? { clicks: 0, ips: new Set() };
      entry.clicks++;
      entry.ips.add(click.ipAddress);
      grouped.set(key, entry);
    }

    // Fill gaps
    const result: object[] = [];
    const current = new Date(startDate);
    const now = new Date();
    while (current <= now) {
      const key = current.toISOString().slice(0, 10);
      const entry = grouped.get(key);
      result.push({ date: key, clicks: entry?.clicks ?? 0, uniqueVisitors: entry?.ips.size ?? 0 });
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return result;
  }

  async getTeamGeoData(teamId: string, period: string): Promise<object[]> {
    const startDate = this.getPeriodStart(period);
    const dateFilter = startDate ? { clickedAt: { gte: startDate } } : {};

    const [rows, total] = await Promise.all([
      prisma.linkClick.groupBy({
        by: ['country', 'countryCode'],
        where: { isBot: false, country: { not: null }, link: { teamId }, ...dateFilter },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 20,
      }),
      prisma.linkClick.count({ where: { isBot: false, link: { teamId }, ...dateFilter } }),
    ]);

    return rows.map((r: { country: string | null; countryCode: string | null; _count: { country: number } }) => ({
      country: r.country!,
      countryCode: r.countryCode,
      clicks: r._count.country,
      percentage: total > 0 ? Math.round((r._count.country / total) * 1000) / 10 : 0,
    }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getPeriodStart(period: string): Date | null {
    const now = Date.now();
    switch (period) {
      case '24h': return new Date(now - 86400000);
      case '7d':  return new Date(now - 7 * 86400000);
      case '30d': return new Date(now - 30 * 86400000);
      case '90d': return new Date(now - 90 * 86400000);
      default:    return null;
    }
  }

  private formatTeam(
    team: { id: string; name: string; slug: string; description: string | null; logo: string | null; ownerId: string; createdAt: Date },
    userId: string,
    memberCount: number,
    linkCount: number,
    role?: string,
  ): TeamWithStats {
    const isOwner = team.ownerId === userId;
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      logo: team.logo,
      ownerId: team.ownerId,
      myRole: isOwner ? TeamRole.ADMIN : (role ?? TeamRole.VIEWER),
      isOwner,
      memberCount,
      linkCount,
      createdAt: team.createdAt,
    };
  }
}

export const teamsService = new TeamsService();