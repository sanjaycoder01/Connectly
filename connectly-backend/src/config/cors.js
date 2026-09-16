const { clientUrl, nodeEnv } = require("./env");

const parseAllowedOrigins = () => {
  const origins = new Set();

  if (clientUrl) {
    clientUrl
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .forEach((url) => origins.add(url));
  }

  // Default development origins
  if (nodeEnv !== "production") {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return Array.from(origins);
};

const allowedOrigins = parseAllowedOrigins();

const originValidator = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-side, test suite)
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  const error = new Error(`CORS policy: origin ${origin} is not allowed.`);
  error.statusCode = 403;
  return callback(error, false);
};

const corsOptions = {
  origin: originValidator,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: [
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
    "Retry-After",
    "Set-Cookie",
  ],
};

module.exports = {
  corsOptions,
  allowedOrigins,
  originValidator,
};
