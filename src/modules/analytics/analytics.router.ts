import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { AnalyticsController } from "./analytics.controller";

const router = Router();

router.get('/dashboard',
    authenticate,
    AnalyticsController.getDashboard);

export { router as analyticsRouter }