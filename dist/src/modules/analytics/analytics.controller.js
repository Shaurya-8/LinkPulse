import asyncHandler from "../../common/utils/asyncHandler";
import { AnalyticsService } from "./analytics.service";
import { DashboardQueryService } from "./dashboardQueuryService";
import { successResponse } from "../../common/utils/response";
const analyticService = new AnalyticsService();
const dashboardQueryService = new DashboardQueryService();
export const AnalyticsController = {
    getDashboard: asyncHandler(async (req, res, next) => {
        const user = req.user;
        const result = await dashboardQueryService.getDashboardStats(user.sub);
        successResponse(res, result.data, 'dashboard fetched succesfull', 201);
    })
};
//# sourceMappingURL=analytics.controller.js.map