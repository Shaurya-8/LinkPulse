import { RateLimiterRedis } from "rate-limiter-flexible";
import { client } from "../../config/redis";
export class RateLimitService {
    cache = new WeakMap();
    getLimiter(options) {
        const opts = JSON.stringify(options);
        let limiter = this.cache.get(opts);
        if (limiter)
            return limiter;
        limiter = new RateLimiterRedis({
            storeClient: client,
            ...options,
        });
        this.cache.set(opts, limiter);
        return limiter;
    }
    consume(policy, req) {
        return this.getLimiter(policy.limiter)
            .consume(policy.key(req));
    }
    limiter(policies) {
        return async (req, res, next) => {
            const promises = [];
            const active = [];
            for (const policy of policies) {
                if (policy.skip)
                    continue;
                active.push(policy);
                promises.push(this.consume(policy, req));
            }
            const results = await Promise.all(promises);
            let limit = Number.MAX_SAFE_INTEGER;
            let remaining = Number.MAX_SAFE_INTEGER;
            let reset = 0;
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const policy = active[i];
                if (policy.limiter.points < limit)
                    limit = policy.limiter.points;
                if (result.remainingPoints < remaining)
                    remaining = result.remainingPoints;
                const retry = Math.ceil(result.msBeforeNext / 1000);
                if (retry > reset)
                    reset = retry;
            }
            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', remaining ?? 0);
            res.setHeader('X-RateLimit-Reset', reset);
            next();
        };
    }
}
//# sourceMappingURL=index.js.map