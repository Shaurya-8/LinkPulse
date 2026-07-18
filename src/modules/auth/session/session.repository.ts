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
} satisfies Prisma.SessionsSelect;

export type SessionsWithUser = Prisma.SessionsGetPayload<{
    select: typeof sessionWithUserSelect;
}>;




export class SessionsRepository {
    constructor(private readonly db: DbClient) { }


    create(data: Prisma.SessionsCreateInput, tx: DbClient = this.db) {
        return tx.sessions.create({ data });
    }

    /**
     * 
     * @param userId 
     * @returns number
     */
    countActive(userId: UserId, tx: DbClient = this.db) {
        return tx.sessions.count({
            where: {
                userId,
                isActive: true,
            },
        });
    }

    get(refreshToken: RefreshToken, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: {
                refreshToken
            },
        })
    }

    getWithUser(refreshToken: string, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: {
                refreshToken
            },
            select: sessionWithUserSelect
        })
    }

    getById(id: string, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: { id }
        })
    }

    getByIdWithUser(id: string, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: { id },
            select: sessionWithUserSelect
        })
    }


    getByAccessJti(accessJti: string, userId?: UserId, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: {
                accessJti,
                userId,
                isActive: true,
            }
        })
    }

    getByAccessJtiWithUser(accessJti: string, userId?: UserId, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: {
                accessJti,
                userId,
                isActive: true,
            },
            select: sessionWithUserSelect
        })
    }

    getAllActive(userId: UserId, tx: DbClient = this.db) {
        return tx.sessions.findMany({
            where: { userId, isActive: true },
            select: { id: true, accessJti: true }
        })
    }

    getOldestActive(userId: UserId, tx: DbClient = this.db) {
        return tx.sessions.findFirst({
            where: {
                userId,
                isActive: true,
            },
            orderBy: {
                lastUsedAt: "asc",
            },
        });
    }

    revoke(refreshToken: string, tx: DbClient = this.db) {
        return tx.sessions.update({
            where: { refreshToken, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
            select: { id: true, accessJti: true }
        });
    }

    revokeAllActive(userId: UserId, tx: DbClient = this.db) {
        return tx.sessions.updateMany({
            where: { userId },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }

    revokeByAccessJti(accessJti: string, tx: DbClient = this.db) {
        return tx.sessions.update({
            where: { accessJti, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }

    updateRefershToken(id: string, refreshToken: string, newJti: string, tx: DbClient = this.db) {
        return tx.sessions.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
                refreshToken: refreshToken,
                accessJti: newJti
            },
            select: sessionWithUserSelect
        });
    }

    updateLastUsed(id: string, tx: DbClient = this.db) {
        return tx.sessions.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }


}