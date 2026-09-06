import { createApp } from "./app.js";
import { Server } from 'http';
import { config } from './config'
import { logger } from './common/utils/logger.js'
import { connectdb, disconnectdb } from "./config/prisma";
import { connectRedis, disconnectRedis } from "./config/redis";

import * as worker from "./jobs/worker"
import { createLinkExpiryScheduler } from "./jobs/schedulers/link-expiry.scheduler.js"


function validateStartupConfig(): void {
    const required: Array<keyof typeof config.jwt | string> = [
        'DATABASE_URL',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET'
    ]
    for (const key of required) {
        if (!process.env[key]) throw new Error(`[Startup] Missing required env var ${key}.`);
    }


    if (config.jwt.accessSecret.length < 64) {
        throw new Error(`[Startup] JWT_ACCESS_SECRET must be at least 64 character in production. `)
    }

    if (config.jwt.refreshSecret.length < 64) {
        throw new Error('[Startup] JWT_REFRESH_SECRET must be at least 64 character in production');
    }

    if (config.jwt.accessSecret === config.jwt.refreshSecret) {
        throw new Error('[Startup] JWT_REFRESH_SECRET and JWT_ACCESS_SECRET must be different');
    }
    logger.debug('startup config validation pass');

}

function registerShutdownHandler(server: Server): void {
    let isShuttingDown = false;

    const shutdown = async (signal: string): Promise<void> => {
        if (isShuttingDown) {
            logger.warn(`${signal} received again - shutdown already in process`);
            return;
        }
        isShuttingDown = true;
        logger.warn(`${signal} received - starting graceful shutdown`, {
            signal, pid: process.pid
        });

        const forceKillTimer = setTimeout(() => {
            logger.error('Graceful shutdown timed out - forcing exit', { timeoutMs: 15_000 });
            process.exit(1);
        }, 15_000)

        forceKillTimer.unref();

        server.close((serverErr) => {
            void (async () => {
                if (serverErr) {
                    logger.error('Error closing HTTP Server', { err: serverErr });
                } else {
                    logger.info('HTTP server closed - no new connections accepted');
                }

                try {
                    await disconnectdb();
                    logger.info('PostgreSQL disconnected');
                } catch (err) {
                    logger.error('Error disconnecting PostgreSQL', { err });
                }

                try {
                    await disconnectRedis();
                    logger.info('Redis disconnected');
                } catch (err) {
                    logger.error('Error disconnecting Redis', { err });
                }

                try {
                    await Promise.allSettled([
                        worker.closeEmailWorker(),
                        worker.closeAnalyticWorker(),
                        worker.closeWebhookWorker()
                    ]);
                    logger.info('Email worker closed');
                } catch (err) {
                    logger.error('Error closing email worker', { err });
                }

                clearTimeout(forceKillTimer);

                logger.info('Graceful shutdown complete - exiting');

                process.exit(serverErr ? 1 : 0);
            })();
        });
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err: Error) => {
        logger.error('UNCAUTCH EXCEPTION - this should never happen', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, Promise: Promise<unknown>) => {
        logger.error('UNHANDLE PROMISE REJECTION - check all async code paths', {
            reason,
            promise: String(Promise)
        })
    })
    logger.debug('Shutdown handler registered');
}

async function bootstrap(): Promise<void> {

    const startTime = Date.now();

    logger.info('───────────────────────────────────────────────');
    logger.info(`   ${config.app.name}  |   ${config.app.env.toUpperCase()}  |   PID ${process.pid}`)
    logger.info('───────────────────────────────────────────────');

    validateStartupConfig();


    logger.info('Connecting to PostgreSQL....');
    await connectdb()

    logger.info('Connecting to Redis...');
    await connectRedis();

    logger.info('Starting email worker...');
    const emailWorker = worker.createEmailWorker();

    const analyticsWorker = worker.createAnalyticsWorker();
    // const bulkWorker = worker.createBulkWorker();
    const webhookWorker = worker.createWebhookWorker();
    const { worker: expiryWorker } = createLinkExpiryScheduler();

    validateStartupConfig();

    const app = await createApp();
    const server = await new Promise<Server>((resolve, rejects) => {
        const srv = app.listen(config.app.port);
        srv.once('listening', () => resolve(srv));
        srv.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {

                rejects(
                    new Error(
                        'port is already in use'
                    )
                )
            } else {
                rejects(error);
            }

        })
    });

    registerShutdownHandler(server);

    const elapsed = Date.now() - startTime;

    logger.info('─────────────────────────────────────────────────');
    logger.info(`     server ready in ${elapsed}ms`);
    logger.info(`     ${config.app.url}:${config.app.port}`);
    logger.info(`     Readiness: ${config.app.url}:${config.app.port}/health`);
    logger.info(`     health:    ${config.app.url}:${config.app.port}/health/ready`);
    logger.info('─────────────────────────────────────────────────')

    if (config.app.isDev) {
        logger.debug('Active config', {
            port: config.app.port,
            corsOrigins: config.security.corsOrigins,
            jwtAccessExpiresIn: config.jwt.accessExpires,
            jwtRefreshExpiresIn: config.jwt.refreshExpires,
            otpExpiresMinutes: config.otp.expiresMinutes,
            sessionMaxPerUser: config.session.maxPerUser,
            refreshRotation: config.session.refreshTokenRotation,
        });
    }

}

// import http from 'http';
// import { connectdb, disconnectdb } from './config/prisma.js';
// import { redis, redisForBull } from './config/redis';
// import { createAnalyticsWorker } from './jobs/workers/analytics.worker';
// import { createEmailWorker } from './jobs/workers/email.worker';
// import { createBulkWorker } from './jobs/workers/bulk.worker';
// import { createWebhookWorker } from './jobs/workers/webhook.worker';
// import { createLinkExpiryScheduler } from './jobs/schedulers/link-expiry.scheduler';

// async function bootstrap(): Promise<void> {
//     await connectdb();

//     const app = createApp();
//     const server = http.createServer(app);

//     // const analyticsWorker = createAnalyticsWorker();
//     // const emailWorker = createEmailWorker();
//     // const bulkWorker = createBulkWorker();
//     // const webhookWorker = createWebhookWorker();
//     // const { worker: expiryWorker } = createLinkExpiryScheduler();

//     logger.info('✅ BullMQ workers started (analytics, email, bulk, webhook, expiry)');

//     server.listen(config.app.port, () => {
//         logger.info(`🚀 Server running on port ${config.app.port} [${config.app.env}]`);
//         logger.info(`📡 API:          ${config.app.url}/api`);
//         logger.info(`📖 API Docs:     ${config.app.url}/api/docs`);
//         logger.info(`🔗 Short domain: ${config.app.url}`);
//     });

//     async function shutdown(signal: string): Promise<void> {
//         logger.info(`\n${signal} received — graceful shutdown…`);
//         server.close(async () => {
//             logger.info('HTTP server closed');
//             await Promise.allSettled([
//                 analyticsWorker.close(),
//                 emailWorker.close(),
//                 bulkWorker.close(),
//                 webhookWorker.close(),
//                 expiryWorker.close(),
//             ]);
//             logger.info('Workers closed');
//             await disconnectdb();
//             await disconnectRedis();
//             // await redisForBull.quit();
//             logger.info('Shutdown complete');
//             process.exit(0);
//         });
//         setTimeout(() => { logger.error('Forced exit'); process.exit(1); }, 30_000);
//     }

//     process.on('SIGTERM', () => shutdown('SIGTERM'));
//     process.on('SIGINT', () => shutdown('SIGINT'));

//     process.on('unhandledRejection', (reason) => {
//         logger.error('Unhandled rejection:', reason);
//         if (config.app.env === 'production') shutdown('unhandledRejection').catch(() => process.exit(1));
//     });

//     process.on('uncaughtException', (err) => {
//         logger.error('Uncaught exception:', err);
//         shutdown('uncaughtException').catch(() => process.exit(1));
//     });
// }

// bootstrap().catch((err) => {
//     console.error('Fatal startup error:', err);
//     process.exit(1);
// });


bootstrap()
    .catch((err) => {
        logger.error(
            '[Fetal] server failed to start', {
            message: err.message,
            stack: err.stack
        })
    })
