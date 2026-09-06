import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/prisma/client";
import jwt from "jsonwebtoken";
import { AppError, ValidationAppError } from "../common/errors/AppError";
import { logger } from "../common/utils/logger";
import { config } from "../config";
import type { ApiResponse, ValidationError } from "../types";


const { JsonWebTokenError, TokenExpiredError, NotBeforeError } = jwt;
function getRequestId(req: Request): string {
    return (req as any).requestId as string ?? (req.headers["x-request-id"] as string) ?? "unknown";
}

/** Send a JSON error response in the standard ApiResponse envelope */
export function sendError(
    res: Response,
    status: number,
    message: string,
    code: string,
    extra?: {
        errors?: ValidationError[],
        stack?: string,
        detail?: string
    }
): void {
    const body: ApiResponse<null> = {
        success: false,
        message,
        meta: {
            code,
            ...(extra?.detail && { detail: extra.detail })
        }
    };

    if (extra?.errors?.length) {
        body.errors = extra.errors;
    }

    // Only expose stack tranes in development ─ never in production
    if (config.app.isDev && extra?.stack) {
        (body.meta as any).stack = extra.stack;
    }

    res.status(status).json(body);
}

// Prisma Error Map

interface PrismaErrorResult {
    status: number;
    message: string;
    code: string;
    detail?: string;
}

export function handlePrismaError(err: unknown): PrismaErrorResult | null {
    // P2002 — Unique constraint violation (e.g., duplicate email)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002": {
                const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? "field";
                return {
                    status: 409,
                    message: `A recode with this ${fields} already exists.`,
                    code: "CONFLICT",
                    detail: config.app.isDev ? `Prisma P2002 on: ${fields}` : undefined,
                };
            }
            case 'P2025': {
                // Record not found — e.g. update/delete on non-existent row
                return {
                    status: 404,
                    message: 'The requested record was not found.',
                    code: 'NOT_FOUND',
                    detail: config.app.isDev ? `Prisma P2025: ${err.meta?.cause}` : undefined,
                };
            }
            case 'P2003': {
                // Foreign key constraint failure
                return {
                    status: 400,
                    message: 'Operation failed due to a related record constraint.',
                    code: 'CONSTRAINT_VIOLATION',
                    detail: config.app.isDev ? `Prisma P2003 on field: ${err.meta?.field_name}` : undefined,
                };
            }
            case 'P2014': {
                // Required relation violation
                return {
                    status: 400,
                    message: 'Required relation is missing.',
                    code: 'RELATION_VIOLATION',
                };
            }
            case 'P2016': {
                // Query interpretation error
                return {
                    status: 400,
                    message: 'Invalid query.',
                    code: 'BAD_REQUEST',
                };
            }
            default: {
                return {
                    status: 500,
                    message: 'A database error occurred.',
                    code: 'DATABASE_ERROR',
                    detail: config.app.isDev ? `Prisma ${err.code}: ${err.message}` : undefined,
                };
            }
        }
    }

    // P1xxx — Connection / environment errors (DB unreachable, wrong URL, etc.)
    if (err instanceof Prisma.PrismaClientInitializationError) {
        return {
            status: 503,
            message: 'Database is temporarily unavailable.',
            code: 'DATABASE_UNAVAILABLE',
            detail: config.app.isDev ? err.message : undefined,
        };
    }

    // Timeout
    if (err instanceof Prisma.PrismaClientRustPanicError) {
        return {
            status: 500,
            message: 'A critical database engine error occurred.',
            code: 'DATABASE_ENGINE_ERROR',
        };
    }
    if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        return {
            status: 500,
            message: 'An unknown database error occurred.',
            code: 'DATABASE_ERROR',
            detail: config.app.isDev ? err.message : undefined,
        };
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        // This is a programmer error — a Prisma query was built with wrong types
        return {
            status: 500,
            message: 'Internal query error.',
            code: 'QUERY_VALIDATION_ERROR',
            detail: config.app.isDev ? err.message : undefined,
        };
    }

    return null; // Not a Prisma error — let the caller handle it
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ERROR HANDLER
// Registered as the LAST middleware in app.ts via app.use(errorHandler).
// Express identifies it as an error handler because it takes 4 arguments.
// ─────────────────────────────────────────────────────────────────────────────


export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // _next must be declared even if unused — Express requires all 4 params
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    const requestId = getRequestId(req);

    // ── 1. Validation errors (express-validator field errors) ──────────────────
    if (err instanceof ValidationAppError) {
        logger.warn('Validation error', {
            requestId,
            path: req.path,
            method: req.method,
            errors: err.errors,
        });
        sendError(res, 422, err.message, err.code, { errors: err.errors });
        return;
    }

    // ── 2. Known operational AppErrors ─────────────────────────────────────────
    // These are errors we threw intentionally (UnauthorizedError, NotFoundError, etc.)
    // They are safe to expose to the client as-is.
    if (err instanceof AppError && err.isOperational) {
        // Only log 5xx operational errors — 4xx are expected client mistakes
        if (err.statusCode >= 500) {
            logger.error('Operational 5xx error', {
                requestId,
                code: err.code,
                message: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method,
            });
        } else {
            logger.warn('Client error', {
                requestId,
                code: err.code,
                message: err.message,
                statusCode: err.statusCode,
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
        }

        sendError(res, err.statusCode, err.message, err.code, {
            stack: err.stack,
        });
        return;
    }

    // ── 3. Prisma / database errors ────────────────────────────────────────────
    const prismaResult = handlePrismaError(err);
    if (prismaResult) {
        logger.error('Prisma error', {
            requestId,
            code: (err as any).code,
            meta: (err as any).meta,
            path: req.path,
            method: req.method,
            detail: prismaResult.detail,
        });
        sendError(
            res,
            prismaResult.status,
            prismaResult.message,
            prismaResult.code,
            { detail: prismaResult.detail }
        );
        return;
    }


    // ── 4. JWT errors ──────────────────────────────────────────────────────────
    if (err instanceof TokenExpiredError) {
        logger.warn('JWT expired', { requestId, path: req.path });
        sendError(res, 401, 'Access token has expired. Please refresh your tokens.', 'TOKEN_EXPIRED');
        return;
    }

    if (err instanceof NotBeforeError) {
        logger.warn('JWT not yet valid', { requestId, path: req.path });
        sendError(res, 401, 'Token is not yet valid.', 'TOKEN_NOT_BEFORE');
        return;
    }

    if (err instanceof JsonWebTokenError) {
        logger.warn('JWT malformed', { requestId, message: err.message, path: req.path });
        sendError(res, 401, 'Invalid access token.', 'TOKEN_INVALID');
        return;
    }

    // ── 5. Malformed JSON body ─────────────────────────────────────────────────
    // Express throws a SyntaxError when it can't parse the JSON body
    if (err instanceof SyntaxError && 'body' in err) {
        logger.warn('Malformed JSON body', {
            requestId,
            path: req.path,
            method: req.method,
        });

        sendError(
            res,
            400,
            'Request body contains invalid JSON. Please check your payload.',
            'INVALID_JSON'
        );
        return;
    }

    // ── 6. Payload too large ───────────────────────────────────────────────────
    // Express throws this when the body exceeds the limit set in app.ts (10 KB)
    if ((err as any).type === 'entity.too.large') {
        sendError(
            res,
            413,
            'Request payload is too large. Maximum allowed size is 10 KB.',
            'PAYLOAD_TOO_LARGE'
        );
        return;
    }


    // ── 7. CORS errors ─────────────────────────────────────────────────────────
    if (err.message?.startsWith('CORS policy violation')) {
        sendError(res, 403, err.message, 'CORS_BLOCKED');
        return;
    }

    // ── 8. Unknown / programming errors ───────────────────────────────────────
    // We got here — something unexpected happened (null dereference, unhandled
    // promise, etc.). Log everything we can; expose nothing sensitive to the client.
    logger.error('Unhandled server error', {
        requestId,
        name: err.name,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        body: config.app.isDev ? req.body : '[redacted]',
    });


    sendError(
        res,
        500,
        config.app.isDev
            ? err.message
            : 'An unexpected error occurred. Please try again later.',
        'INTERNAL_ERROR',
        { stack: err.stack }
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// Catches any request that fell through all registered routes.
// Registered as a plain middleware (not error middleware) just before errorHandler.
// ─────────────────────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
    const requestId = getRequestId(req);

    logger.warn('Route not found', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });

    const body: ApiResponse<null> = {
        success: false,
        message: `Cannot ${req.method} ${req.path}`,
        meta: {
            code: 'ROUTE_NOT_FOUND',
            requestId,
            available: config.app.env === 'development' ? [
                'POST /api/v1/auth/register',
                'POST /api/v1/auth/verify-otp',
                'POST /api/v1/auth/resend-otp',
                'POST /api/v1/auth/login',
                'POST /api/v1/auth/refresh',
                'POST /api/v1/auth/logout',
                'POST /api/v1/auth/logout-all',
                'GET  /api/v1/auth/me',
                'GET  /api/v1/auth/sessions',
                'GET  /api/v1/auth/devices',
                'DELETE /api/v1/auth/sessions/:sessionId',
                'GET  /health',
                'GET  /health/ready',
            ] : null,
        },
    };

    res.status(404).json(body);
}