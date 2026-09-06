import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { CreateLimitOpt, Policy } from "./types";
import { client } from "../../config/redis.js";

export class RateLimitService {
    private readonly cache = new Map<string, RateLimiterRedis>();

    getLimiter(options: CreateLimitOpt): RateLimiterRedis {
        const opts = JSON.stringify(options)
        let limiter = this.cache.get(opts);

        if (limiter) return limiter;

        limiter = new RateLimiterRedis({
            storeClient: client,
            ...options,
        });

        this.cache.set(opts, limiter);

        return limiter;
    }

    consume(limiter: RateLimiterRedis, key: string): Promise<RateLimiterRes> {
        return limiter.consume(key)
    }

    reward(limiter: RateLimiterRedis, key: string): Promise<RateLimiterRes> {
        return limiter.reward(key);
    }
}