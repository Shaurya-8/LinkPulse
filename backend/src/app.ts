import express from "express";
import type { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet"
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan"

import { config } from "./config/index";
import { logger } from "./common/utils/logger";


import { globalRateLimiter } from "./middleware/rate-limiter.middleware";
import { deviceInfoMiddleware } from "./middleware/deviceInfo.middleware";

import { authRouter } from "./modules/auth/auth.routes";
import { otpRouter } from "./modules/otp/otp.router";
import { linkRouter } from "./modules/links/links.router";
import { redirectRouter } from "./modules/links/redirect/redirect.router"
import { getQueueHealth } from "./jobs/queues";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { analyticsRouter } from "./modules/analytics/analytics.router";

import { limiter } from "./middleware/rate-limiter";
import { policies } from "./middleware/rate-limiter/rate-limiter.policy";
import { subscriptionRouter } from "./modules/subscription/subscription.route";


export async function createApp(): Promise<Application> {
    const app: Application = express();
    // Morgan
    app.use(
        morgan(
            ':remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms',
            {
                stream: {
                    write: (message: String) => logger.http(message.trim())
                },
                skip: (req: Request) => req.url === '/health' || req.url === '/health/ready',
            }
        )
    );


    app.set('trust-proxy', 1);

    app.use(
        helmet({
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            noSniff: true,
            xssFilter: true,

            hsts: {
                maxAge: 15552000, // 180 days
                includeSubDomains: true,
                preload: true,
            },
            contentSecurityPolicy: false,

            referrerPolicy: {
                policy: 'no-referrer',
            },
        })
    );

    app.use(cors({
        origin: (incomingOrigin, callback) => {
            if (!incomingOrigin) return callback(null, true);
            if (incomingOrigin === config.app.frontendUrl) {
                return callback(null, true);
            }
            callback(
                new Error(`CORS policy violation: origin "${incomingOrigin}" is not allowed.`),
                false
            );
        },
        credentials: true,
        methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: [
            'X-Request-ID',
            'RateLimit-Limit',
            'RateLimit-Remaining',
            'RateLimit-Reset',
            'Retry-After'
        ],
    }));
    // app.use(
    //     cors({
    //         origin: (incomingOrigin, callback) => {
    //             if (!incomingOrigin) return callback(null, true);
    //             callback(
    //                 new Error(`CORS policy violation: origin "${incomingOrigin}" is not allowed.`),
    //                 false
    //             );
    //         },
    //         credentials: true,
    //         methods: ['GET', 'POST', 'DELETE'],
    //         allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    //         exposedHeaders: [
    //             'X-Request-ID',
    //             'RateLimit-Limit',
    //             'RateLimit-Remaining',
    //             'RateLimit-Reset',
    //             'Retry-After'
    //         ],
    //     })
    // );

    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true, limit: "10kb" }));

    app.use(cookieParser());

    app.get('/health', (req: Request, res: Response) => {
        const queueHealth = getQueueHealth();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version ?? '1.0.0',
            environment: config.app.env,
            queues: queueHealth,
        });
    });


    app.use(limiter(policies.global));
    // app.use(globalRateLimiter());
    app.use(deviceInfoMiddleware);




    // auth Api
    app.use("/api/v1/auth", authRouter);
    app.use("/api/v1/otp", otpRouter);
    app.use("/api/v1/link", linkRouter);
    app.use("/api/v1/analytics", analyticsRouter);
    app.use("/api/v1/subscription", subscriptionRouter);

    app.use("/", redirectRouter);


    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
} 