import { randomInt } from "crypto";
import { logger } from "../../../common/utils/logger";

import { Prisma } from "../../../../generated/prisma/client";

export function isUniqueConstraintError(
    error: unknown
): error is Prisma.PrismaClientKnownRequestError {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}
function logCollision(shortCode: string, attempt: number) {
    logger.warn("Short code collision", {
        shortCode,
        attempt,
        timestamp: Date.now(),
    });
}


interface RetryOptions {
    maxRetries: number;
    baseDelay?: number;
    shouldRetry(error: unknown): boolean;
    onRetry?(attempt: number, error: unknown): void;
}

const sleep = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const {
        maxRetries,
        shouldRetry,
        onRetry,
        baseDelay = 25,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (!shouldRetry(error) || attempt === maxRetries) {
                throw error;
            }

            onRetry?.(attempt, error);

            const delay =
                baseDelay * (2 ** (attempt - 1)) +
                randomInt(0, baseDelay);

            await sleep(delay);
        }
    }

    throw lastError;
}