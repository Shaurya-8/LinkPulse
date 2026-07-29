import { Router } from "express";
import { redirectController } from "./redirect.controller";
const router = Router();
router.get('/:shortCode', redirectController.redirect);
export { router as redirectRouter };
//# sourceMappingURL=redirect.router.js.map