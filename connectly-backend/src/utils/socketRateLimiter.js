const socketBuckets = new Map();

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

const checkSocketRateLimit = (socket, eventName, customLimits = {}) => {
  const limits = customLimits[eventName] || DEFAULT_SOCKET_LIMITS[eventName];
  if (!limits) {
    return { allowed: true };
  }

  const socketId = socket.id;
  const now = Date.now();

  if (!socketBuckets.has(socketId)) {
    socketBuckets.set(socketId, new Map());
  }

  const userEvents = socketBuckets.get(socketId);
  let record = userEvents.get(eventName);

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + limits.windowMs,
    };
    userEvents.set(eventName, record);
    return { allowed: true };
  }

  record.count += 1;

  if (record.count > limits.max) {
    const retryAfterMs = Math.max(0, record.resetTime - now);
    return {
      allowed: false,
      statusCode: 429,
      message: limits.message,
      retryAfterMs,
    };
  }

  return { allowed: true };
};

const cleanupSocket = (socketId) => {
  socketBuckets.delete(socketId);
};

const resetAll = () => {
  socketBuckets.clear();
};

module.exports = {
  checkSocketRateLimit,
  cleanupSocket,
  resetAll,
  DEFAULT_SOCKET_LIMITS,
};
