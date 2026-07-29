import { prisma } from "../../../config/prisma";
export class PlanRepository {
    db;
    constructor(db = prisma) {
        this.db = db;
    }
    create(data, tx = this.db) {
        return tx.plans.create({
            data,
        });
    }
    findById(id, tx = this.db) {
        return tx.plans.findUnique({
            where: { id },
        });
    }
    findByName(name, tx = this.db) {
        return tx.plans.findUnique({
            where: { name },
        });
    }
    findMany(tx = this.db) {
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
    update(id, data, tx = this.db) {
        return tx.plans.update({
            where: { id },
            data,
        });
    }
    delete(id, tx = this.db) {
        return tx.plans.delete({
            where: { id },
        });
    }
}
//# sourceMappingURL=plan.repository.js.map