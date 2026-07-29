import { UserStatus } from "../../../generated/prisma/client";
export const authUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
    emailVerified: true,
    role: true,
    subscriptions: {
        select: {
            expiresAt: true,
            status: true,
            plan: {
                select: {
                    name: true,
                },
            },
        },
    },
};
export class UserRepository {
    db;
    constructor(db, tx) {
        this.db = db;
    }
    /* -------------------------------------------------------------------------- */
    /* Generic CRUD                                                                */
    /* -------------------------------------------------------------------------- */
    create(args, tx = this.db) {
        return tx.users.create(args);
    }
    findUnique(args, tx = this.db) {
        return tx.users.findUnique(args);
    }
    findFirst(args, tx = this.db) {
        return tx.users.findFirst(args);
    }
    update(args, tx = this.db) {
        return tx.users.update(args);
    }
    delete(args, tx = this.db) {
        return tx.users.delete(args);
    }
    upsert(args, tx = this.db) {
        return tx.users.upsert(args);
    }
    /* -------------------------------------------------------------------------- */
    /* Domain-specific methods                                                     */
    /* -------------------------------------------------------------------------- */
    loginUser(email, tx) {
        return this.findUnique({
            where: { email },
            select: {
                ...authUserSelect,
                passwordHash: true,
            },
        }, tx);
    }
    getUser(email, tx = this.db) {
        return this.findUnique({
            where: { email },
            select: {
                subscriptions: {
                    select: {
                        expiresAt: true,
                        plan: {
                            select: {
                                name: true,
                            },
                        },
                    },
                }
            }
        });
    }
    verifyEmail(email, tx) {
        return this.update({
            where: { email },
            data: {
                emailVerified: true,
                status: UserStatus.ACTIVE,
            },
            select: authUserSelect,
        }, tx);
    }
    updateStatus(email, status, tx) {
        return this.update({
            where: { email },
            data: { status },
            select: authUserSelect,
        }, tx);
    }
    updatePassword(email, passwordHash, tx) {
        return this.update({
            where: { email },
            data: { passwordHash },
            select: authUserSelect,
        }, tx);
    }
    withTransaction(fn, tx = this.db) {
        return this.db.$transaction(fn);
    }
}
//# sourceMappingURL=auth.repository.js.map