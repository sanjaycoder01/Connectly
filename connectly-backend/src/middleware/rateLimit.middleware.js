const { nodeEnv } = require("../config/env");
const {
  consumeRateLimit,
  resetRateLimitKeys,
} = require("../utils/redisRateLimit");

/**
 * Shared HTTP rate limiter backed by Redis (with in-memory fallback).
 * Keys: ratelimit:{type}:{userId|ip} via keyGenerator values.
 */
const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 60,
  message = "Too many requests, please try again later.",
  keyGenerator,
} = {}) => {
  const middleware = async (req, res, next) => {
    try {
      // Allow test suite to bypass limits outside production
      if (
        req.headers["x-skip-rate-limit"] &&
        nodeEnv !== "production"
      ) {
        return next();
      }

      const identity =
        req.ip ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "anonymous";

      const key = keyGenerator ? keyGenerator(req) : `api:${identity}`;

      const { count, ttlMs } = await consumeRateLimit(key, windowMs);
      const remaining = Math.max(0, max - count);
      const resetEpochSec = Math.ceil((Date.now() + ttlMs) / 1000);
      const retryAfterSec = Math.max(1, Math.ceil(ttlMs / 1000));

      res.setHeader("RateLimit-Limit", max);
      res.setHeader("RateLimit-Remaining", remaining);
      res.setHeader("RateLimit-Reset", resetEpochSec);

      if (count > max) {
        res.setHeader("Retry-After", retryAfterSec);
        return res.status(429).json({
          message,
        });
      }

      return next();
    } catch (err) {
      console.error("[RateLimit] middleware error:", err.message);
      // Fail open so Redis issues don't take down the API
      return next();
    }
  };

  middleware.reset = async (prefix) => {
    await resetRateLimitKeys(prefix);
  };

  middleware.windowMs = windowMs;
  middleware.max = max;
  middleware.message = message;

  return middleware;
};

// 1. Auth endpoints: 15 attempts per 15 minutes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  keyGenerator: (req) =>
    `auth:${req.ip || req.socket?.remoteAddress || "anonymous"}`,
});

// 2. User search: 120 searches per minute
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Search rate limit exceeded. Please slow down.",
  keyGenerator: (req) =>
    `search:${req.user?._id || req.ip || req.socket?.remoteAddress || "anonymous"}`,
});

// 3. Messages REST creation: 60 messages per minute
const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many messages sent via API. Please wait a moment.",
  keyGenerator: (req) =>
    `msg:${req.user?._id || req.ip || req.socket?.remoteAddress || "anonymous"}`,
});

// 4. Global fallback limiter: 300 requests per 15 minutes
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests to Connectly API. Please try again later.",
  keyGenerator: (req) =>
    `api:${req.ip || req.socket?.remoteAddress || "anonymous"}`,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  searchLimiter,
  messageLimiter,
  apiLimiter,
};
