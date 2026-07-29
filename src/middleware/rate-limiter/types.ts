import { Request } from "express";

export interface CreateLimitOpt {
  keyPrefix: string;
  points: number;
  duration: number;
  blockDuration: number;
}

export interface Policy {
  /** Identifier used for logging and metrics */
  name: string;

  /** Limiter configuration */
  limiter: CreateLimitOpt;

  /** Redis key for this request */
  key(req: Request): string;

  /**
   * Roll back consumed points if the request fails.
   * Useful for endpoints where only successful requests
   * should count.
   */
  rollback?: boolean;

  /**
   * Skip this policy for the current request.
   */
  skip?(req: Request): boolean;
}