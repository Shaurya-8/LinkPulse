import { TypeOf } from "zod/v3";
import { Prisma } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { UserId } from "../../types";
import { CreateLinkInput } from "./links.schema";
import { includes } from "zod";


export class LinkRepository {
  constructor(private db: DbClient) { }

  create<T extends Prisma.LinksCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksCreateArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T>> {
    return tx.links.create(args);
  }

  findUnique<T extends Prisma.LinksFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksFindUniqueArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T> | null> {
    return tx.links.findUnique(args);
  }

  findFirst<T extends Prisma.LinksFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksFindFirstArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T> | null> {
    return tx.links.findFirst(args);
  }

  findMany<T extends Prisma.LinksFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksFindManyArgs>,
    tx: DbClient = this.db
  ) {
    return tx.links.findMany(args);
  }

  update<T extends Prisma.LinksUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksUpdateArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T>> {
    return tx.links.update(args);
  }

  delete<T extends Prisma.LinksDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksDeleteArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T>> {
    return tx.links.delete(args);
  }

  upsert<T extends Prisma.LinksUpsertArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksUpsertArgs>,
    tx: DbClient = this.db
  ): Promise<Prisma.LinksGetPayload<T>> {
    return tx.links.upsert(args);
  }

  count<T extends Prisma.LinksCountArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksCountArgs>,
    tx: DbClient = this.db
  ) {
    return tx.links.count(args);
  }



  createLink(
    data: { dto: CreateLinkInput, shortCode: string, normalizedUrl: string },
    userId?: UserId,
    tx: DbClient = this.db
  ) {
    return this.create({
      data: {
        ...data.dto,
        shortCode: data.shortCode,
        normalizedUrl: data.normalizedUrl,
        ...(userId && {
          user: {
            connect: { id: userId },
          }
        })
      },
      include: linkInclude
    }, tx);
  }


  findByShortCode(shortCode: string, tx?: DbClient) {
    return this.findFirst({
      where: { shortCode },
      include: linkInclude
    }, tx);
  }

  GetAll(userId: UserId, tx?: DbClient) {
    return this.findMany({ where: { userId } }, tx)
  }

  GetAllActive(userId: UserId, tx?: DbClient) {
    return this.findMany({ where: { userId, isActive: true } }, tx)
  }

  expireCode(shortCode: string, tx?: DbClient) {
    return this.update({
      where: { shortCode },
      data: {
        isActive: false
      }
    }, tx)
  }

  checkCustomAliasAvailable(customAlias: string, tx: DbClient) {
    return this.findFirst({
      where: { shortCode: customAlias }
    }, tx);
  }

  findById(id: string, userId: UserId, tx?: DbClient) {
    return this.findFirst({
      where: { id, userId },
      include: linkInclude
    })
  }

  deleteLink(id: string, tx?: DbClient) {
    return this.delete({
      where: {
        id
      }
    });
  }

  countLinks(userId: UserId, tx?: DbClient) {
    return this.count({ where: { userId } });
  }

  countActive(userId: UserId, tx?: DbClient) {
    return this.count({ where: { userId, isActive: true } })
  }
}


export const linkInclude = {
  redirectRules: {
    where: { isActive: true },
    orderBy: { priority: "desc" },
  },
  abTests: {
    where: { isActive: true },
    include: {
      variants: true,
    },
  },
} satisfies Prisma.LinksInclude;


export type LinkWithRelations = Prisma.LinksGetPayload<{
  include: typeof linkInclude;
}>;