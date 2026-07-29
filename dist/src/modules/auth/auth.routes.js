import { Router } from "express";
import * as controller from "./auth.controller";
import * as schema from "./auth.schema";
import { validate } from "../../middleware/validate.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { deviceInfoMiddleware } from "../../middleware/deviceInfo.middleware";
import * as rateLimiter from "../../middleware/rate-limiter.middleware";
const authRouter = Router();
authRouter.use(deviceInfoMiddleware);
authRouter.post("/register", rateLimiter.registerRateLimiter(), validate({ body: schema.registerSchema.shape.body }), controller.register);
authRouter.post("/login", rateLimiter.loginRateLimiter(), rateLimiter.progressiveDelay(), validate({ body: schema.loginSchema.shape.body }), controller.login);
authRouter.post("/refresh", controller.refreshToken);
authRouter.post("/logout", authenticate, controller.logout);
authRouter.post("/send-reset-password-email", authenticate, validate({ body: schema.sendResetPasswordEmailSchema.shape.body }), controller.resetPasswordRequest);
authRouter.delete("/delete-user", authenticate, validate({ body: schema.deleteSchema.shape.body }), controller.deleteUser);
export { authRouter };
//# sourceMappingURL=auth.routes.js.map