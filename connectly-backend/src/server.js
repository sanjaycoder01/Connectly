const http = require("http");
const app = require("./app");
const { port, nodeEnv } = require("./config/env");
const connectDB = require("./config/db");
const { disconnectRedis } = require("./config/redis");
const initSocket = require("./sockets");

const server = http.createServer(app);

let isShuttingDown = false;

const startServer = async () => {
  await connectDB();
  await initSocket(server);

  server.listen(port, () => {
    console.log(`Server running on port ${port} (${nodeEnv})`);
  });
};

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    try {
      await disconnectRedis();
    } catch (err) {
      console.error("Error during Redis shutdown:", err.message);
    } finally {
      process.exit(0);
    }
  });

  // Force exit if connections hang
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
