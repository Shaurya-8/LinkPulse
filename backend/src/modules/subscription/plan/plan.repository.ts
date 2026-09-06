import { Prisma, PlanType } from "../../../../generated/prisma/client";
import { prisma } from "../../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PlanRepository {
    constructor(private readonly db: DbClient = prisma) { }

    create(
        data: Prisma.PlansCreateInput,
        tx: DbClient = this.db
    ) {
        return tx.plans.create({
            data,
        });
    }

    findById(
        id: string,
        tx: DbClient = this.db
    ) {
        return tx.plans.findUnique({
            where: { id },
        });
    }

    findByName(
        name: PlanType,
        tx: DbClient = this.db
    ) {
        return tx.plans.findUnique({
            where: { name },
        });
    }

    findMany(tx: DbClient = this.db) {
        return tx.plans.findMany({
            include: {
                prices: true,
                featureLimits: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    }

    update(
        id: string,
        data: Prisma.PlansUpdateInput,
        tx: DbClient = this.db
    ) {
        return tx.plans.update({
            where: { id },
            data,
        });
    }

    delete(
        id: string,
        tx: DbClient = this.db
    ) {
        return tx.plans.delete({
            where: { id },
        });
    }
}