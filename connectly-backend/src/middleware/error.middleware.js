const { nodeEnv } = require("../config/env");

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // 1. Mongoose CastError (invalid ObjectId or invalid type conversion)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for resource identifier (${err.path})`;
  }

  // 2. Mongoose schema ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(", ") || "Validation error";
  }

  // 3. MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // 4. JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
  }

  // 5. CORS policy violation
  if (typeof err.message === "string" && err.message.startsWith("CORS policy:")) {
    statusCode = 403;
  }

  // 6. Log internal errors (500) and sanitize sensitive output
  if (statusCode >= 500) {
    console.error("[ServerError]", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      timestamp: new Date().toISOString(),
    });

    // In production, never leak internal implementation details
    if (nodeEnv === "production") {
      message = "Internal server error";
    }
  }

  res.status(statusCode).json({
    message,
    ...(nodeEnv === "development" && statusCode >= 500 ? { debug: err.message } : {}),
  });
};

module.exports = errorHandler;
