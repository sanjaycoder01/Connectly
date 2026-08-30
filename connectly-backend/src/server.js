const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const { port, nodeEnv } = require("./config/env");
const connectDB = require("./config/db");
const socketAuth = require("./middleware/socketAuth.middleware");
const conversationService = require("./services/conversation.service");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_conversation", async (conversationId) => {
    try {
      await conversationService.assertParticipant(
        conversationId,
        socket.user._id
      );

      socket.join(conversationId.toString());

      console.log(
        `${socket.user.username} joined conversation ${conversationId}`
      );

      socket.emit("join_conversation_success", { conversationId });
    } catch (error) {
      socket.emit("join_conversation_error", {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

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