import { Prisma } from "../../../../generated/prisma/client";
import { DbClient } from "../../../config/prisma";
import { RefreshToken, UserId } from "../../../types";
import { authUserSelect } from "../auth.repository";

export const sessionWithUserSelect = {
    id: true,
    refreshToken: true,
    expiresAt: true,
    lastUsedAt: true,
    user: {
        select: authUserSelect,
    },
} satisfies Prisma.SessionSelect;

export type SessionWithUser = Prisma.SessionGetPayload<{
    select: typeof sessionWithUserSelect;
}>;






export class SessionRepository {
    constructor(private readonly db: DbClient) { }


    create(data: Prisma.SessionCreateInput) {
        return this.db.session.create({ data });
    }

    /**
     * 
     * @param userId 
     * @returns number
     */
    countActive(userId: UserId) {
        return this.db.session.count({
            where: {
                userId,
                isActive: true,
            },
        });
    }

    get(refreshToken: RefreshToken) {
        return this.db.session.findFirst({
            where: {
                refreshToken
            },
        })
    }

    getWithUser(refreshToken: string) {
        return this.db.session.findFirst({
            where: {
                refreshToken
            },
            select: sessionWithUserSelect
        })
    }

    getById(id: string) {
        return this.db.session.findFirst({
            where: { id }
        })
    }

    getByIdWithUser(id: string) {
        return this.db.session.findFirst({
            where: { id },
            select: sessionWithUserSelect
        })
    }


    getByAccessJti(accessJti: string, userId?: UserId) {
        return this.db.session.findFirst({
            where: {
                accessJti,
                userId,
                isActive: true,
            }
        })
    }

    getByAccessJtiWithUser(accessJti: string, userId?: UserId) {
        return this.db.session.findFirst({
            where: {
                accessJti,
                userId,
                isActive: true,
            },
            select: sessionWithUserSelect
        })
    }

    getAllActive(userId: UserId) {
        return this.db.session.findMany({
            where: { userId, isActive: true },
            select: { id: true, accessJti: true }
        })
    }

    getOldestActive(userId: UserId) {
        return this.db.session.findFirst({
            where: {
                userId,
                isActive: true,
            },
            orderBy: {
                lastUsedAt: "asc",
            },
        });
    }

    revoke(refreshToken: string) {
        return this.db.session.update({
            where: { refreshToken, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
            select: { id: true, accessJti: true }
        });
    }

    revokeAllActive(userId: UserId,) {
        return this.db.session.updateMany({
            where: { userId },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }

    revokeByAccessJti(accessJti: string,) {
        return this.db.session.update({
            where: { accessJti, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }

    updateRefershToken(id: string, refreshToken: string, newJti: string) {
        return this.db.session.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
                refreshToken: refreshToken,
                accessJti: newJti
            },
            select: sessionWithUserSelect
        });
    }

    updateLastUsed(id: string) {
        return this.db.session.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }


}