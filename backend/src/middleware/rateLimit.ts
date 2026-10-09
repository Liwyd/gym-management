import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { fail } from "../lib/respond";

function build(
  windowMs: number,
  limit: number,
  message: string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 429, "RATE_LIMITED", message);
    },
  });
}

/** Strict limit for login attempts (brute-force protection). */
export const loginRateLimit = build(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again in 15 minutes.",
);

/** General limit for all other auth endpoints. */
export const authRateLimit = build(
  15 * 60 * 1000,
  60,
  "Too many requests. Please try again later.",
);
