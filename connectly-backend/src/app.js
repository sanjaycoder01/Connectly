const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { corsOptions } = require("./config/cors");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/message.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// 1. Secure CORS configuration
app.use(cors(corsOptions));

// 2. Request body & cookie parsers (with reasonable size limits to prevent body bombing)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// 3. Health check (exempt from rate limiting)
app.use("/health", healthRoutes);

// 4. API routes with fallback rate limiting
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// 5. Centralized sanitized error handling
app.use(errorHandler);

module.exports = app;
