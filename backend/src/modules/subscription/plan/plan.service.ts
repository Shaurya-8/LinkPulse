import { PlanType, Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../config/prisma";
import { PlanRepository } from "./plan.repository";

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PlanService {
    constructor(
        private readonly planRepository = new PlanRepository()
    ) { }

    async createPlan(
        name: PlanType,
        tx?: DbClient
    ) {

        return this.planRepository.create(
            { name },
            tx
        );
    }

    getPlanById(
        id: string,
        tx?: DbClient
    ) {
        return this.planRepository.findById(id, tx);
    }

    getPlanByName(
        name: PlanType,
        tx?: DbClient
    ) {
        return this.planRepository.findByName(name, tx);
    }

    getPlans(tx?: DbClient) {
        return this.planRepository.findMany(tx);
    }

    updatePlan(
        id: string,
        data: Prisma.PlansUpdateInput,
        tx?: DbClient
    ) {
        return this.planRepository.update(id, data, tx);
    }

    deletePlan(
        id: string,
        tx?: DbClient
    ) {
        return this.planRepository.delete(id, tx);
    }
}