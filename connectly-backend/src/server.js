const http = require("http");
const app = require("./app");
const { port, nodeEnv } = require("./config/env");
const connectDB = require("./config/db");
const initSocket = require("./sockets");

const server = http.createServer(app);

initSocket(server);

const startServer = async () => {
  await connectDB();

  server.listen(port, () => {
    console.log(`Server running on port ${port} (${nodeEnv})`);
  });
};

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
