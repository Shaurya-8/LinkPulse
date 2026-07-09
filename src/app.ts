import express from "express";
import type { Application, Request, Response } from "express";
import helmet from "helmet"
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan"

import { config } from "./config/index.ts";
import { logger } from "./common/utils/logger";

import { authRouter } from "./modules/auth/auth.routes.ts";

import { globalRateLimiter } from "./middleware/rate-limiter.middleware.ts";
import { deviceInfoMiddleware } from "./middleware/deviceInfo.middleware.ts";

import {otpRouter} from "./modules/otp/otp.router.ts";


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
    // redirect link api

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

    app.use(globalRateLimiter());
    app.use(deviceInfoMiddleware);



    app.get('/health', (req: Request, res: Response) => {
        res.json({ message: "Runing Fine" }).status(200)
    })
    // auth Api
    app.use("/api/v1/auth", authRouter);
    app.use("/api/v1/otp", otpRouter);



    return app;
} 