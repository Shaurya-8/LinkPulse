import { BillingPeriod, Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PlanPriceRepository {
    constructor(private readonly db: DbClient = prisma) { }

    create(
        data: Prisma.PlanPricesCreateInput,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.create({
            data,
        });
    }

    findById(
        id: string,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.findUnique({
            where: { id },
            include: {
                plan: true,
            },
        });
    }

    findByPlan(
        planId: string,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.findMany({
            where: {
                planId,
            },
            orderBy: {
                billingPeriod: "asc",
            },
        });
    }

    findByPlanAndBillingPeriod(
        planId: string,
        billingPeriod: BillingPeriod,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.findUnique({
            where: {
                planId_billingPeriod: {
                    planId,
                    billingPeriod,
                },
            },
        });
    }

    findMany(tx: DbClient = this.db) {
        return tx.planPrices.findMany({
            include: {
                plan: true,
            },
            orderBy: [
                {
                    plan: {
                        name: "asc",
                    },
                },
                {
                    billingPeriod: "asc",
                },
            ],
        });
    }

    update(
        id: string,
        data: Prisma.PlanPricesUpdateInput,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.update({
            where: { id },
            data,
        });
    }

    upsert(
        planId: string,
        billingPeriod: BillingPeriod,
        price: Prisma.Decimal | number,
        currency = "USD",
        tx: DbClient = this.db
    ) {
        return tx.planPrices.upsert({
            where: {
                planId_billingPeriod: {
                    planId,
                    billingPeriod,
                },
            },
            create: {
                plan: {
                    connect: {
                        id: planId,
                    },
                },
                billingPeriod,
                price,
                currency,
            },
            update: {
                price,
                currency,
            },
        });
    }

    delete(
        id: string,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.delete({
            where: {
                id,
            },
        });
    }

    deleteByPlan(
        planId: string,
        tx: DbClient = this.db
    ) {
        return tx.planPrices.deleteMany({
            where: {
                planId,
            },
        });
    }
}