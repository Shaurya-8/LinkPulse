import { PlanPriceRepository } from "./plan-price.repository";
import { PlanRepository } from "../plan/plan.repository";
export class PlanPriceService {
    planRepository;
    planPriceRepository;
    constructor(planRepository = new PlanRepository(), planPriceRepository = new PlanPriceRepository()) {
        this.planRepository = planRepository;
        this.planPriceRepository = planPriceRepository;
    }
    async createPrice(planId, billingPeriod, price, currency = "USD", tx) {
        const plan = await this.planRepository.findById(planId, tx);
        if (!plan) {
            throw new Error("Plan not found.");
        }
        const existing = await this.planPriceRepository.findByPlanAndBillingPeriod(planId, billingPeriod, tx);
        if (existing) {
            throw new Error("Price already exists for this billing period.");
        }
        return this.planPriceRepository.create({
            billingPeriod,
            price,
            currency,
            plan: {
                connect: {
                    id: planId,
                },
            },
        }, tx);
    }
    getPriceById(id, tx) {
        return this.planPriceRepository.findById(id, tx);
    }
    getPlanPrices(planId, tx) {
        return this.planPriceRepository.findByPlan(planId, tx);
    }
    getPrice(planId, billingPeriod, tx) {
        return this.planPriceRepository.findByPlanAndBillingPeriod(planId, billingPeriod, tx);
    }
    getAllPrices(tx) {
        return this.planPriceRepository.findMany(tx);
    }
    updatePrice(id, data, tx) {
        return this.planPriceRepository.update(id, data, tx);
    }
    upsertPrice(planId, billingPeriod, price, currency = "USD", tx) {
        return this.planPriceRepository.upsert(planId, billingPeriod, price, currency, tx);
    }
    deletePrice(id, tx) {
        return this.planPriceRepository.delete(id, tx);
    }
    deletePlanPrices(planId, tx) {
        return this.planPriceRepository.deleteByPlan(planId, tx);
    }
}
//# sourceMappingURL=plan-price.service.js.map