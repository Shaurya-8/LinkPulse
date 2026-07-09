import { Prisma } from "../../../generated/prisma/client";
import { DbClient } from "../../config/prisma";
import { CreateLinkDto } from "./link.type"

export default class LinkRepository {
    constructor(private db: DbClient) { }


    create(data: Prisma.LinkCreateInput) {
        return this.db.link.create({ data })
    }
    
    withTransaction<T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>
    ): Promise<T> {
        return this.db.$transaction(fn);
    }
} 