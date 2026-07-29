import { Request, Response, NextFunction } from "express";

import { RateLimitService } from "./LimiterService";
import { Policy } from "./types";
import { RateLimiterRes } from "rate-limiter-flexible";

const rateLimterService = new RateLimitService();

export function limiter(policies: Policy[]) {
    return async (req: Request, res: Response, next: NextFunction) => {

        const active: Policy[] = [];

        for (const policy of policies) {
            if (policy.skip) continue;
            active.push(policy);
        }

        const executions = active.map(policy => ({
            limit: policy.limiter.points,
            limiter: rateLimterService.getLimiter(policy.limiter),
            key: policy.key(req),
        }));

        const settled = await Promise.allSettled(
            executions.map(policy => rateLimterService.consume(policy.limiter, policy.key))
        );

        const succeeded: number[] = [];
        let failure: unknown;

        for (let i = 0; i < settled.length; i++) {
            const result = settled[i]!;

            if (result.status === "fulfilled") {
                succeeded.push(i);
            } else if (!failure) {
                failure = result.reason;
            }
        }


        if (failure) {
            await Promise.allSettled(
                succeeded.map(i =>
                    rateLimterService.reward(executions[i]!.limiter, executions[i]!.key)
                )
            );
        }

        const responses: RateLimiterRes[] = [];

        for (const result of settled) {
            if (result.status === "fulfilled") {
                responses.push(result.value);
            } else if (result.reason instanceof RateLimiterRes) {
                responses.push(result.reason);
            }
        }


        let limit = Number.MAX_SAFE_INTEGER;
        let remaining = Number.MAX_SAFE_INTEGER;
        let reset = 0;

        for (let i = 0; i < responses.length; i++) {
            const policy = active[i]!;
            const res = responses[i]!;

            limit = Math.min(limit, policy.limiter.points);
            remaining = Math.min(remaining, res.remainingPoints);
            reset = Math.max(reset, Math.ceil(res.msBeforeNext / 1000));
        }

        res.setHeader("X-RateLimit-Limit", limit);
        res.setHeader("X-RateLimit-Remaining", Math.max(remaining, 0));
        res.setHeader("X-RateLimit-Reset", reset);

        if (failure) {
            if (failure instanceof RateLimiterRes) {
                return res.status(429).json({
                    message: "Too many requests",
                    retryAfter: Math.ceil(failure.msBeforeNext / 1000),
                });
            }
            return next(failure);
        }
        next();
    }
}