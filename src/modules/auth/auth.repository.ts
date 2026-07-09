import { Prisma } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma"
import { RegisterDto } from "../../types";
import { UserStatus } from "../../../generated/prisma/client";
export const authUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
    emailVerified: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{
    select: typeof authUserSelect;
}>;

export class UserRepository {
    constructor(private db: DbClient) { }

    // Common select for authenticated user


    /**
     * Register User
    */
    createUser(data: RegisterDto) {
        return this.db.user.create({
            data,
        });
    }
    /**
     * Login User
     * Returns password so it can be compared.
    */
    loginUser(email: string) {
        return this.db.user.findUnique({
            where: { email },
            select: { ...authUserSelect, passwordHash: true }
        });
    }

    /**
     * Get user by email
    */
    getByEmail(email: string) {
        return this.db.user.findUnique({
            where: { email },
        });
    }

    getById(id: string) {
        return this.db.user.findUnique({
            where: { id },
        });
    }

    /**
     * Get user with custom select
     */
    getByEmailSelect<T extends Prisma.UserSelect>(
        email: string,
        select: T
    ): Promise<Prisma.UserGetPayload<{ select: T }> | null> {
        return this.db.user.findUnique({
            where: { email },
            select,
        });
    }

    /**
    * Update status
    */
    updateStatus(email: string, status: UserStatus) {
        return this.db.user.update({
            where: { email },
            data: { status },
            select: authUserSelect,
        });
    }

    /**
     * Verify Email
     */
    verifyEmail(email: string) {
        return this.db.user.update({
            where: { email },
            data: {
                emailVerified: true,
                status: UserStatus.ACTIVE
            },
            select: authUserSelect,
        });
    }


    /**
     * Update password
     */
    updatePassword(email: string, passwordHash: string) {
        return this.db.user.update({
            where: { email },
            data: { passwordHash },
            select: authUserSelect
        });
    }

    /**
     * Update profile
     */
    updateProfile(
        email: string,
        data: Prisma.UserUpdateInput
    ) {
        return this.db.user.update({
            where: { email },
            data,
        });
    }

    /**
     * Generic update
     */
    update<T extends Prisma.UserUpdateArgs>(
        args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>
    ): Promise<Prisma.UserGetPayload<T>> {
        return this.db.user.update(args);
    }


    /**
     * Upsert
     */
    upsert<T extends Prisma.UserUpsertArgs>(
        args: Prisma.SelectSubset<T, Prisma.UserUpsertArgs>
    ): Promise<Prisma.UserGetPayload<T>> {
        return this.db.user.upsert(args);
    }

    /**
     * Delete user
     */
    deleteUser(email: string) {
        return this.db.user.delete({
            where: { email },
        });
    }

    withTransaction<T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>
    ): Promise<T> {
        return this.db.$transaction(fn);
    }
}