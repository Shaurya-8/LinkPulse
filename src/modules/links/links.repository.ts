import { TypeOf } from "zod/v3";
import { Prisma } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { UserId } from "../../types";
import { CreateLinkDto } from "./links.schema";

export const shortLink = {
  shortCode: true,
  longUrl: true,
  isActive: true,
  expiresAt: true,
  isOneTime: true,
  passwordHash: true,
  clickLimit: true,
} satisfies Prisma.LinksSelect;

export type ShortLinkResult = Prisma.LinksGetPayload<{
  select: typeof shortLink
}>


export class LinkRepository {
  constructor(private db: DbClient) { }

  create<T extends Prisma.LinksCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksCreateArgs>
  ): Promise<Prisma.LinksGetPayload<T>> {
    return this.db.links.create(args);
  }

  findUnique<T extends Prisma.LinksFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksFindUniqueArgs>
  ): Promise<Prisma.LinksGetPayload<T> | null> {
    return this.db.links.findUnique(args);
  }

  findFirst<T extends Prisma.LinksFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksFindFirstArgs>
  ): Promise<Prisma.LinksGetPayload<T> | null> {
    return this.db.links.findFirst(args);
  }

  update<T extends Prisma.LinksUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksUpdateArgs>
  ): Promise<Prisma.LinksGetPayload<T>> {
    return this.db.links.update(args);
  }

  delete<T extends Prisma.LinksDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksDeleteArgs>
  ): Promise<Prisma.LinksGetPayload<T>> {
    return this.db.links.delete(args);
  }

  upsert<T extends Prisma.LinksUpsertArgs>(
    args: Prisma.SelectSubset<T, Prisma.LinksUpsertArgs>
  ): Promise<Prisma.LinksGetPayload<T>> {
    return this.db.links.upsert(args);
  }

  checkCustomAliasAvailable(customAlias: string) {
    return this.db.links.findFirst({
      where: { shortCode: customAlias }
    })
  }

  createLink(
    data: { dto: CreateLinkDto, shortCode: string, normalizedUrl: string },
    userId: UserId,
    tx: DbClient = this.db
  ) {
    return tx.links.create({
      data: {
        ...data.dto,
        shortCode: data.shortCode,
        normalizedUrl: data.normalizedUrl,
        user: {
          connect: { id: userId },
        },
      },
      select: shortLink,
    });
  }

  findFirstLink(shortCode: string, tx: DbClient = this.db) {
    return tx.links.findFirst({
      where: { shortCode },
      select: shortLink
    });
  }

} 
