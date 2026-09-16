const { nodeEnv } = require("../config/env");

class MemoryRateLimiter {
  constructor({ windowMs = 60 * 1000, max = 60, message = "Too many requests, please try again later." } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map();

    // Periodically sweep expired entries every 60s
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (record.resetTime <= now) {
          this.hits.delete(key);
        }
      }
    }, 60 * 1000);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  middleware({ keyGenerator } = {}) {
    return (req, res, next) => {
      // In tests, allow bypass if header is explicitly provided
      if (nodeEnv === "test" && req.headers["x-skip-rate-limit"]) {
        return next();
      }

      const key = keyGenerator
        ? keyGenerator(req)
        : req.ip ||
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket.remoteAddress ||
          "anonymous";

      const now = Date.now();
      let record = this.hits.get(key);

      if (!record || record.resetTime <= now) {
        record = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.hits.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.max - record.count);
      const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader("RateLimit-Limit", this.max);
      res.setHeader("RateLimit-Remaining", remaining);
      res.setHeader("RateLimit-Reset", Math.ceil(record.resetTime / 1000));

      if (record.count > this.max) {
        res.setHeader("Retry-After", resetSeconds);
        return res.status(429).json({
          message: this.message,
        });
      }

      next();
    };
  }

  reset() {
    this.hits.clear();
  }
}

const createRateLimiter = (options) => {
  const limiter = new MemoryRateLimiter(options);
  const mw = limiter.middleware({
    keyGenerator: options?.keyGenerator,
  });
  mw.limiter = limiter;
  return mw;
};

// 1. Auth endpoints: 15 attempts per 15 minutes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  keyGenerator: (req) => `auth:${req.ip || req.socket.remoteAddress}`,
});

// 2. User search: 120 searches per minute
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Search rate limit exceeded. Please slow down.",
  keyGenerator: (req) => `search:${req.user?._id || req.ip || req.socket.remoteAddress}`,
});

// 3. Messages REST creation: 60 messages per minute
const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many messages sent via API. Please wait a moment.",
  keyGenerator: (req) => `msg:${req.user?._id || req.ip || req.socket.remoteAddress}`,
});

// 4. Global fallback limiter: 300 requests per 15 minutes
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests to Connectly API. Please try again later.",
  keyGenerator: (req) => `api:${req.ip || req.socket.remoteAddress}`,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  searchLimiter,
  messageLimiter,
  apiLimiter,
};
