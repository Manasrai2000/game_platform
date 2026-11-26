import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory sliding-window rate limiter middleware.
 * Protects auth, OTP, and helpdesk endpoints from brute-force and spam.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const current = store.get(key);
    if (!current || now > current.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            options.message ||
            `Too many requests. Please wait ${retryAfterSec} seconds and try again.`,
        },
      });
      return;
    }

    current.count += 1;
    next();
  };
}
