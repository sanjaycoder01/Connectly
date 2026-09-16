const conversationService = require("../services/conversation.service");
const messageService = require("../services/message.service");
const presenceService = require("../services/presence.service");
const openConversationService = require("../services/openConversation.service");
const { corsOptions } = require("../config/cors");
const {
  checkSocketRateLimit,
  cleanupSocket,
} = require("../utils/socketRateLimiter");
const {
  validateJoinConversation,
  validateLeaveConversation,
  validateSendMessage,
  validateTypingEvent,
  validateMessageDelivered,
  validateMessageRead,
} = require("../utils/socketValidation");
const { handleSocketError } = require("../utils/socketError");

const respond = (ack, payload) => {
  if (typeof ack === "function") {
    ack(payload);
  }
};

const registerChatHandlers = async (io, socket) => {
  const userId = socket.user._id;
  const username = socket.user.username;

  try {
    const becameOnline = await presenceService.addSocket(userId, socket.id);

    if (becameOnline) {
      socket.broadcast.emit("user_online", {
        userId: userId.toString(),
        username,
      });
    }

    const onlineUserIds = await presenceService.getOnlineUserIds();
    socket.emit("presence_snapshot", {
      onlineUserIds,
    });
  } catch (err) {
    console.error("[Presence] failed to register connection:", err.message);
    socket.emit("presence_snapshot", { onlineUserIds: [] });
  }

  // 1. Join conversation room
  socket.on("join_conversation", async (conversationId, ack) => {
    try {
      // Rate limiting
      const rate = await checkSocketRateLimit(socket, "join_conversation");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "join_conversation",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err, "join_conversation_error");
      }

      // Input validation
      const validation = validateJoinConversation(conversationId);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err, "join_conversation_error");
      }

      const validCid = validation.conversationId;

      // Authorization check (user must be an authorized participant)
      await conversationService.assertParticipant(validCid, userId);

      const roomId = validCid.toString();
      socket.join(roomId);
      openConversationService.open(roomId, userId, socket.id);

      const readResult = await messageService.markConversationRead(
        roomId,
        userId
      );

      if (readResult.updated) {
        io.to(roomId).emit("message_read", {
          conversationId: roomId,
          messageIds: readResult.messageIds,
          readBy: userId.toString(),
          readAt: readResult.readAt,
        });
      }

      const success = { ok: true, conversationId: roomId };
      socket.emit("join_conversation_success", {
        conversationId: roomId,
      });
      respond(ack, success);
    } catch (error) {
      handleSocketError(socket, ack, error, "join_conversation_error");
    }
  });

  // 2. Leave conversation room
  socket.on("leave_conversation", async (conversationId, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "leave_conversation");
      if (!rate.allowed) {
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateLeaveConversation(conversationId);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const validCid = validation.conversationId;
      const roomId = validCid.toString();
      socket.leave(roomId);
      openConversationService.close(roomId, userId, socket.id);

      respond(ack, { ok: true, conversationId: roomId });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 3. Send message
  socket.on("send_message", async (payload, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "send_message");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "send_message",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateSendMessage(payload);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const { conversationId, content, clientMessageId } = validation.data;

      // createMessage asserts participant membership authorization
      const { message, created } = await messageService.createMessage(
        conversationId,
        userId,
        content,
        clientMessageId
      );

      if (created) {
        io.to(conversationId.toString()).emit("new_message", message);
      }

      respond(ack, { ok: true, message, created });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 4. Typing start
  socket.on("typing_start", async (payload, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "typing_start");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "typing_start",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateTypingEvent(payload);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const validCid = validation.conversationId;
      await conversationService.assertParticipant(validCid, userId);

      socket.to(validCid.toString()).emit("typing_start", {
        conversationId: validCid.toString(),
        userId: userId.toString(),
        username,
      });

      respond(ack, { ok: true });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 5. Typing stop
  socket.on("typing_stop", async (payload, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "typing_stop");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "typing_stop",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateTypingEvent(payload);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const validCid = validation.conversationId;
      await conversationService.assertParticipant(validCid, userId);

      socket.to(validCid.toString()).emit("typing_stop", {
        conversationId: validCid.toString(),
        userId: userId.toString(),
        username,
      });

      respond(ack, { ok: true });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 6. Message delivered status
  socket.on("message_delivered", async (payload, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "message_delivered");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "message_delivered",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateMessageDelivered(payload);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const { message, updated } = await messageService.markMessageDelivered(
        validation.messageId,
        userId
      );

      if (updated) {
        io.to(message.conversationId.toString()).emit("message_delivered", {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
          status: message.status,
          deliveredAt: message.deliveredAt,
          deliveredBy: userId.toString(),
        });
      }

      respond(ack, { ok: true, message, updated });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 7. Message read status
  socket.on("message_read", async (payload, ack) => {
    try {
      const rate = await checkSocketRateLimit(socket, "message_read");
      if (!rate.allowed) {
        socket.emit("rate_limit_exceeded", {
          event: "message_read",
          message: rate.message,
          retryAfterMs: rate.retryAfterMs,
        });
        const err = new Error(rate.message);
        err.statusCode = rate.statusCode;
        return handleSocketError(socket, ack, err);
      }

      const validation = validateMessageRead(payload);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.statusCode = 400;
        return handleSocketError(socket, ack, err);
      }

      const roomId = validation.conversationId.toString();
      const result = await messageService.markConversationRead(roomId, userId);

      if (result.updated) {
        io.to(roomId).emit("message_read", {
          conversationId: roomId,
          messageIds: result.messageIds,
          readBy: userId.toString(),
          readAt: result.readAt,
        });
      }

      respond(ack, {
        ok: true,
        messageIds: result.messageIds,
        updated: result.updated,
      });
    } catch (error) {
      handleSocketError(socket, ack, error);
    }
  });

  // 8. Disconnect handler
  socket.on("disconnect", async () => {
    openConversationService.closeAllForSocket(socket.id);
    cleanupSocket(socket.id);

    try {
      const becameOffline = await presenceService.removeSocket(userId, socket.id);

      if (becameOffline) {
        socket.broadcast.emit("user_offline", {
          userId: userId.toString(),
          username,
        });
      }
    } catch (err) {
      console.error("[Presence] failed to handle disconnect:", err.message);
    }
  });
};

const initSocket = async (server) => {
  const { Server } = require("socket.io");
  const { createAdapter } = require("@socket.io/redis-adapter");
  const { connectRedis } = require("../config/redis");
  const socketAuth = require("../middleware/socketAuth.middleware");

  const io = new Server(server, {
    cors: corsOptions,
  });

  // Attach Redis adapter when REDIS_URL is configured so room/event
  // broadcasts work across multiple Node.js instances.
  const redisClients = await connectRedis();
  if (redisClients) {
    io.adapter(createAdapter(redisClients.pubClient, redisClients.subClient));
    console.log("[Socket.IO] Redis adapter attached");
  }

  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, socket.user.username);
    void registerChatHandlers(io, socket).catch((err) => {
      console.error("[Socket.IO] failed to register handlers:", err.message);
    });
  });

  return io;
};

module.exports = initSocket;
module.exports.registerChatHandlers = registerChatHandlers;
