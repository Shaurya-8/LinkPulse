import { Router } from "express";
import * as controller from "./auth.controller";
import * as schema from "./auth.schema";
import { validate } from "../../middleware/validate.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { deviceInfoMiddleware } from "../../middleware/deviceInfo.middleware";
import * as rateLimiter from "../../middleware/rate-limiter.middleware";

const authRouter = Router();

authRouter.use(deviceInfoMiddleware);

authRouter.post("/register",
    rateLimiter.registerRateLimiter(),
    validate(schema.registerSchema, "body"),
    controller.register
);
authRouter.post("/login",
    rateLimiter.loginRateLimiter(),
    rateLimiter.progressiveDelay(),
    validate(schema.loginSchema, "body"),
    controller.login
);
authRouter.post("/refresh",
    controller.refreshToken
);

authRouter.post("/logout",
    authenticate,
    controller.logout
);

// authRouter.post("/forgot-password",
//     authenticate,
//     rateLimiter.passwordResetRateLimiter(),
//     rateLimiter.progressiveDelay(),
//     validate(schema.forgotPasswordSchema, "body"),
//     controller.forgotPassword
// );

authRouter.post("/send-reset-password-email",
    authenticate,
    validate(schema.sendResetPasswordEmailSchema, "body"),
    controller.sendResetPasswordEmail
);
authRouter.post("/reset-password",
    authenticate,
    rateLimiter.passwordResetRateLimiter(),
    rateLimiter.progressiveDelay(),
    controller.resetPassword
);

authRouter.delete("/delete-user",
    authenticate,
    validate(schema.deleteSchema, "body"),
    controller.deleteUser
);

export { authRouter }