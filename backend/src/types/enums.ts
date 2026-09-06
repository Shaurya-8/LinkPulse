export const TeamRole ={
  ADMIN : 'ADMIN',
  EDITOR : 'EDITOR',
  VIEWER : 'VIEWER',
}

export type TeamRole = typeof TeamRole[keyof typeof TeamRole];

export const TEAM_ROLE_HIERARCHY: TeamRole[] = [
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
]

export function hasTeamPermission(userRole: TeamRole, requiredRole: TeamRole): boolean {
    const userRoleIndex = TEAM_ROLE_HIERARCHY.indexOf(userRole);
    const requiredRoleIndex = TEAM_ROLE_HIERARCHY.indexOf(requiredRole);
    return userRoleIndex <= requiredRoleIndex;
}


// ────────────────────── WebHook Events ──────────

export const WebhookEventType = {
    LINK_CREATED: 'link.created',
    LINK_UPDATED: 'link.updated',
    LINK_DELETED: 'link.deleted',
    LINK_CLICKED: 'link.clicked',
    LINK_EXPIRED: 'link.expired',
    TEAM_MEMBER_JOINED: 'team.member_joined',
    TEAM_MEMBER_REMOVED: 'team.member.removed'

}as const;
export type WebhookEventType = (typeof WebhookEventType)[keyof typeof WebhookEventType]
export const ALL_WEBHOOK_EVENTS = Object.values(WebhookEventType) as WebhookEventType[];
