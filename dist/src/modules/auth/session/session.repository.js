import { authUserSelect } from "../auth.repository";
export const sessionWithUserSelect = {
    id: true,
    refreshToken: true,
    expiresAt: true,
    lastUsedAt: true,
    user: {
        select: authUserSelect,
    },
};
export class SessionsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    create(data, tx = this.db) {
        return tx.sessions.create({ data });
    }
    /**
     *
     * @param userId
     * @returns number
     */
    countActive(userId, tx = this.db) {
        return tx.sessions.count({
            where: {
                userId,
                isActive: true,
            },
        });
    }
    get(refreshToken, tx = this.db) {
        return tx.sessions.findFirst({
            where: {
                refreshToken
            },
        });
    }
    getWithUser(refreshToken, tx = this.db) {
        return tx.sessions.findFirst({
            where: {
                refreshToken,
                isActive: true
            },
            select: sessionWithUserSelect
        });
    }
    getById(id, tx = this.db) {
        return tx.sessions.findFirst({
            where: { id }
        });
    }
    getByIdWithUser(id, tx = this.db) {
        return tx.sessions.findFirst({
            where: { id },
            select: sessionWithUserSelect
        });
    }
    getByAccessJti(accessJti, tx = this.db) {
        return tx.sessions.findFirst({
            where: {
                accessJti,
                isActive: true,
            }
        });
    }
    getByAccessJtiWithUser(accessJti, userId, tx = this.db) {
        return tx.sessions.findFirst({
            where: {
                accessJti,
                userId,
                isActive: true,
            },
            select: sessionWithUserSelect
        });
    }
    getAllActive(userId, tx = this.db) {
        return tx.sessions.findMany({
            where: { userId, isActive: true },
            select: { id: true, accessJti: true }
        });
    }
    getOldestActive(userId, tx = this.db) {
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
    revoke(refreshToken, tx = this.db) {
        return tx.sessions.update({
            where: { refreshToken, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
            select: { id: true, accessJti: true }
        });
    }
    revokeAllActive(userId, tx = this.db) {
        return tx.sessions.updateMany({
            where: { userId },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }
    revokeByAccessJti(accessJti, tx = this.db) {
        return tx.sessions.update({
            where: { accessJti, isActive: true },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
    }
    updateRefershToken(id, refreshToken, newJti, tx = this.db) {
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
    updateLastUsed(id, tx = this.db) {
        return tx.sessions.update({
            where: { id },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }
}
//# sourceMappingURL=session.repository.js.map