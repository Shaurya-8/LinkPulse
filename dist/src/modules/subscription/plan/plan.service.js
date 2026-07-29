import { PlanRepository } from "./plan.repository";
export class PlanService {
    planRepository;
    constructor(planRepository = new PlanRepository()) {
        this.planRepository = planRepository;
    }
    async createPlan(name, tx) {
        return this.planRepository.create({ name }, tx);
    }
    getPlanById(id, tx) {
        return this.planRepository.findById(id, tx);
    }
    getPlanByName(name, tx) {
        return this.planRepository.findByName(name, tx);
    }
    getPlans(tx) {
        return this.planRepository.findMany(tx);
    }
    updatePlan(id, data, tx) {
        return this.planRepository.update(id, data, tx);
    }
    deletePlan(id, tx) {
        return this.planRepository.delete(id, tx);
    }
}
//# sourceMappingURL=plan.service.js.map