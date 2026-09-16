const { nodeEnv } = require("../config/env");

const handleSocketError = (socket, ack, error, errorEventName = null) => {
  let statusCode = error?.statusCode || 500;
  let message = error?.message || "Internal server error";

  // 1. Mongoose CastError
  if (error?.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for resource identifier (${error.path || "id"})`;
  }

  // 2. Mongoose ValidationError
  if (error?.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(", ") || "Validation error";
  }

  // 3. Log 500 errors server-side and sanitize output
  if (statusCode >= 500) {
    console.error("[SocketError]", {
      event: errorEventName,
      user: socket?.user?._id?.toString(),
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });

    if (nodeEnv === "production") {
      message = "Internal server error";
    }
  }

  const payload = {
    ok: false,
    message,
    statusCode,
  };

  if (errorEventName) {
    socket.emit(errorEventName, payload);
  }

  if (typeof ack === "function") {
    ack(payload);
  }

  return payload;
};

module.exports = {
  handleSocketError,
};
