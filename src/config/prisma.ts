import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from './index.js';
import { logger } from '../common/utils/logger.js';

declare global {
    var __prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
    connectionString: config.db.url
});

const createPrismaClient = (): PrismaClient => {
    const prisma = new PrismaClient({
        adapter,
        log: config.app.isDev
            ? [
                { level: "query", emit: "event" },
                { level: "error", emit: "stdout" },
                { level: "warn", emit: "stdout" },
            ]
            : [{ level: "error", emit: "stdout" }],
    });

    if (config.app.isDev) {
        prisma.$on('query', (e) => {
            logger.info('[Prisma] Query', e.query)
        });
    }
    return prisma;
}

export const prisma = globalThis.__prisma || createPrismaClient();

export async function connectdb(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info('Database is connected via Prisma');
    }
    catch (err) {
        logger.error('Failed to connect Databse ', { err });
    }
}

export async function disconnectdb(): Promise<void> {
    await prisma.$disconnect();
    logger.info('Database disconnected...')

}



export type DbClient =
    PrismaClient | Prisma.TransactionClient;