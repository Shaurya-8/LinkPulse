import { NextFunction, Request, Response, RequestHandler } from "express";
import asyncHandler from "../../common/utils/asyncHandler";

import { AnalyticsService } from "./analytics.service";
import { DashboardQueryService } from "./dashboardQueuryService";
import { LinkRepository } from "../links/links.repository";
import { prisma } from "../../config/prisma";
import { AuthenticatedRequest } from "../../types";
import { successResponse } from "../../common/utils/response";

const analyticService = new AnalyticsService();
const dashboardQueryService = new DashboardQueryService();
export const AnalyticsController = {
    getDashboard: asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;
        const result = await dashboardQueryService.getDashboardStats(user.sub);

        successResponse(res,
            result.data,
            'dashboard fetched succesfull',
            201
        )
    })
}