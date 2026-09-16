const {
  consumeRateLimit,
  resetRateLimitKeys,
} = require("./redisRateLimit");

const DEFAULT_SOCKET_LIMITS = {
  send_message: {
    windowMs: 5000,
    max: 10,
    message: "You are sending messages too fast. Please slow down.",
  },
  typing_start: {
    windowMs: 5000,
    max: 8,
    message: "Typing indicator rate limit exceeded.",
  },
  typing_stop: {
    windowMs: 5000,
    max: 8,
    message: "Typing indicator rate limit exceeded.",
  },
  join_conversation: {
    windowMs: 10000,
    max: 20,
    message: "Too many conversation join requests.",
  },
  leave_conversation: {
    windowMs: 10000,
    max: 20,
    message: "Too many conversation leave requests.",
  },
  message_delivered: {
    windowMs: 10000,
    max: 40,
    message: "Delivery status rate limit exceeded.",
  },
  message_read: {
    windowMs: 10000,
    max: 40,
    message: "Read status rate limit exceeded.",
  },
};

/**
 * Shared Socket.IO rate limiter (Redis + memory fallback).
 * Key: ratelimit:socket:{event}:{userId|socketId}
 */
const checkSocketRateLimit = async (socket, eventName, customLimits = {}) => {
  const limits = customLimits[eventName] || DEFAULT_SOCKET_LIMITS[eventName];
  if (!limits) {
    return { allowed: true };
  }

  const identity =
    socket.user?._id?.toString() ||
    socket.userId?.toString() ||
    socket.id ||
    "anonymous";

  const key = `socket:${eventName}:${identity}`;

  try {
    const { count, ttlMs } = await consumeRateLimit(key, limits.windowMs);

    if (count > limits.max) {
      return {
        allowed: false,
        statusCode: 429,
        message: limits.message,
        retryAfterMs: Math.max(0, ttlMs),
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("[SocketRateLimit] error, allowing request:", err.message);
    return { allowed: true };
  }
};

/** No-op for Redis (TTL cleans keys); kept for API compatibility. */
const cleanupSocket = (_socketId) => {};

const resetAll = async () => {
  await resetRateLimitKeys("socket:");
};

module.exports = {
  checkSocketRateLimit,
  cleanupSocket,
  resetAll,
  DEFAULT_SOCKET_LIMITS,
};
