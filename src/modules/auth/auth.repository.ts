import { Prisma, UserStatus } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";

export const authUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  emailVerified: true,
} satisfies Prisma.UsersSelect;

export type AuthUser = Prisma.UsersGetPayload<{
  select: typeof authUserSelect;
}>;

export class UserRepository {
  constructor(private readonly db: DbClient, tx?: DbClient) { }

  /* -------------------------------------------------------------------------- */
  /* Generic CRUD                                                                */
  /* -------------------------------------------------------------------------- */

  create<T extends Prisma.UsersCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersCreateArgs>,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T>> {
    return tx.users.create(args);
  }

  findUnique<T extends Prisma.UsersFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersFindUniqueArgs>
    ,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T> | null> {
    return tx.users.findUnique(args);
  }

  findFirst<T extends Prisma.UsersFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersFindFirstArgs>
    ,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T> | null> {
    return tx.users.findFirst(args);
  }

  update<T extends Prisma.UsersUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersUpdateArgs>
    ,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T>> {
    return tx.users.update(args);
  }

  delete<T extends Prisma.UsersDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersDeleteArgs>
    ,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T>> {
    return tx.users.delete(args);
  }

  upsert<T extends Prisma.UsersUpsertArgs>(
    args: Prisma.SelectSubset<T, Prisma.UsersUpsertArgs>
    ,
    tx: DbClient = this.db): Promise<Prisma.UsersGetPayload<T>> {
    return tx.users.upsert(args);
  }

  /* -------------------------------------------------------------------------- */
  /* Domain-specific methods                                                     */
  /* -------------------------------------------------------------------------- */

  loginUser(email: string, tx?: DbClient) {
    return this.findUnique({
      where: { email },
      select: {
        ...authUserSelect,
        passwordHash: true,
      },
    }, tx);
  }

  verifyEmail(email: string, tx?: DbClient) {
    return this.update({
      where: { email },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
      select: authUserSelect,
    }, tx);
  }

  updateStatus(email: string, status: UserStatus, tx?: DbClient) {
    return this.update({
      where: { email },
      data: { status },
      select: authUserSelect,
    }, tx);
  }

  updatePassword(email: string, passwordHash: string, tx?: DbClient) {
    return this.update({
      where: { email },
      data: { passwordHash },
      select: authUserSelect,
    }, tx);
  }

  withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
    ,
    tx: DbClient = this.db): Promise<T> {
    return this.db.$transaction(fn);
  }
}