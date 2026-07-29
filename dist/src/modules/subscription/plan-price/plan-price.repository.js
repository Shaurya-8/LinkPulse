import { prisma } from "../../../config/prisma";
export class PlanPriceRepository {
    db;
    constructor(db = prisma) {
        this.db = db;
    }
    create(data, tx = this.db) {
        return tx.planPrices.create({
            data,
        });
    }
    findById(id, tx = this.db) {
        return tx.planPrices.findUnique({
            where: { id },
            include: {
                plan: true,
            },
        });
    }
    findByPlan(planId, tx = this.db) {
        return tx.planPrices.findMany({
            where: {
                planId,
            },
            orderBy: {
                billingPeriod: "asc",
            },
        });
    }
    findByPlanAndBillingPeriod(planId, billingPeriod, tx = this.db) {
        return tx.planPrices.findUnique({
            where: {
                planId_billingPeriod: {
                    planId,
                    billingPeriod,
                },
            },
        });
    }
    findMany(tx = this.db) {
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
    update(id, data, tx = this.db) {
        return tx.planPrices.update({
            where: { id },
            data,
        });
    }
    upsert(planId, billingPeriod, price, currency = "USD", tx = this.db) {
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
    delete(id, tx = this.db) {
        return tx.planPrices.delete({
            where: {
                id,
            },
        });
    }
    deleteByPlan(planId, tx = this.db) {
        return tx.planPrices.deleteMany({
            where: {
                planId,
            },
        });
    }
}
//# sourceMappingURL=plan-price.repository.js.map