import {
    BillingPeriod,
    Prisma,
} from "../../../../generated/prisma/client";
import { prisma } from "../../../config/prisma";
import { PlanPriceRepository } from "./plan-price.repository";
import { PlanRepository } from "../plan/plan.repository";

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PlanPriceService {
    constructor(
        private readonly planRepository = new PlanRepository(),
        private readonly planPriceRepository = new PlanPriceRepository()
    ) { }

    async createPrice(
        planId: string,
        billingPeriod: BillingPeriod,
        price: number,
        currency = "USD",
        tx?: DbClient
    ) {
        const plan = await this.planRepository.findById(planId, tx);

        if (!plan) {
            throw new Error("Plan not found.");
        }

        const existing =
            await this.planPriceRepository.findByPlanAndBillingPeriod(
                planId,
                billingPeriod,
                tx
            );

        if (existing) {
            throw new Error(
                "Price already exists for this billing period."
            );
        }

        return this.planPriceRepository.create(
            {
                billingPeriod,
                price,
                currency,
                plan: {
                    connect: {
                        id: planId,
                    },
                },
            },
            tx
        );
    }

    getPriceById(
        id: string,
        tx?: DbClient
    ) {
        return this.planPriceRepository.findById(id, tx);
    }

    getPlanPrices(
        planId: string,
        tx?: DbClient
    ) {
        return this.planPriceRepository.findByPlan(
            planId,
            tx
        );
    }

    getPrice(
        planId: string,
        billingPeriod: BillingPeriod,
        tx?: DbClient
    ) {
        return this.planPriceRepository.findByPlanAndBillingPeriod(
            planId,
            billingPeriod,
            tx
        );
    }

    getAllPrices(tx?: DbClient) {
        return this.planPriceRepository.findMany(tx);
    }

    updatePrice(
        id: string,
        data: Prisma.PlanPricesUpdateInput,
        tx?: DbClient
    ) {
        return this.planPriceRepository.update(id, data, tx);
    }

    upsertPrice(
        planId: string,
        billingPeriod: BillingPeriod,
        price: number,
        currency = "USD",
        tx?: DbClient
    ) {
        return this.planPriceRepository.upsert(
            planId,
            billingPeriod,
            price,
            currency,
            tx
        );
    }

    deletePrice(
        id: string,
        tx?: DbClient
    ) {
        return this.planPriceRepository.delete(id, tx);
    }

    deletePlanPrices(
        planId: string,
        tx?: DbClient
    ) {
        return this.planPriceRepository.deleteByPlan(
            planId,
            tx
        );
    }
}