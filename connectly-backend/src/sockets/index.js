const conversationService = require("../services/conversation.service");
const messageService = require("../services/message.service");
const presenceService = require("../services/presence.service");
const openConversationService = require("../services/openConversation.service");

const respond = (ack, payload) => {
  if (typeof ack === "function") {
    ack(payload);
  }
};

const registerChatHandlers = (io, socket) => {
  const userId = socket.user._id;
  const username = socket.user.username;

  const becameOnline = presenceService.addSocket(userId, socket.id);

  if (becameOnline) {
    socket.broadcast.emit("user_online", {
      userId: userId.toString(),
      username,
    });
  }

  socket.emit("presence_snapshot", {
    onlineUserIds: presenceService.getOnlineUserIds(),
  });

  socket.on("join_conversation", async (conversationId, ack) => {
    try {
      if (!conversationId) {
        const payload = {
          ok: false,
          message: "conversationId is required",
          statusCode: 400,
        };
        socket.emit("join_conversation_error", payload);
        return respond(ack, payload);
      }

      await conversationService.assertParticipant(conversationId, userId);

      const roomId = conversationId.toString();
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
      const payload = {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      };
      socket.emit("join_conversation_error", payload);
      respond(ack, payload);
    }
  });

  socket.on("leave_conversation", async (conversationId, ack) => {
    try {
      if (!conversationId) {
        return respond(ack, {
          ok: false,
          message: "conversationId is required",
          statusCode: 400,
        });
      }

      const roomId = conversationId.toString();
      socket.leave(roomId);
      openConversationService.close(roomId, userId, socket.id);

      respond(ack, { ok: true, conversationId: roomId });
    } catch (error) {
      respond(ack, {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on(
    "send_message",
    async ({ conversationId, content, clientMessageId }, ack) => {
      try {
        if (!conversationId || !content?.trim() || !clientMessageId?.trim()) {
          return respond(ack, {
            ok: false,
            message:
              "conversationId, content, and clientMessageId are required",
            statusCode: 400,
          });
        }

        const { message, created } = await messageService.createMessage(
          conversationId,
          userId,
          content.trim(),
          clientMessageId.trim()
        );

        if (created) {
          io.to(conversationId.toString()).emit("new_message", message);
        }

        respond(ack, { ok: true, message, created });
      } catch (error) {
        respond(ack, {
          ok: false,
          message: error.message,
          statusCode: error.statusCode || 500,
        });
      }
    }
  );

  socket.on("typing_start", async ({ conversationId }, ack) => {
    try {
      if (!conversationId) {
        return respond(ack, {
          ok: false,
          message: "conversationId is required",
          statusCode: 400,
        });
      }

      await conversationService.assertParticipant(conversationId, userId);

      socket.to(conversationId.toString()).emit("typing_start", {
        conversationId: conversationId.toString(),
        userId: userId.toString(),
        username,
      });

      respond(ack, { ok: true });
    } catch (error) {
      respond(ack, {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on("typing_stop", async ({ conversationId }, ack) => {
    try {
      if (!conversationId) {
        return respond(ack, {
          ok: false,
          message: "conversationId is required",
          statusCode: 400,
        });
      }

      await conversationService.assertParticipant(conversationId, userId);

      socket.to(conversationId.toString()).emit("typing_stop", {
        conversationId: conversationId.toString(),
        userId: userId.toString(),
        username,
      });

      respond(ack, { ok: true });
    } catch (error) {
      respond(ack, {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on("message_delivered", async ({ messageId }, ack) => {
    try {
      if (!messageId) {
        return respond(ack, {
          ok: false,
          message: "messageId is required",
          statusCode: 400,
        });
      }

      const { message, updated } = await messageService.markMessageDelivered(
        messageId,
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
      respond(ack, {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on("message_read", async ({ conversationId }, ack) => {
    try {
      if (!conversationId) {
        return respond(ack, {
          ok: false,
          message: "conversationId is required",
          statusCode: 400,
        });
      }

      const roomId = conversationId.toString();
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
      respond(ack, {
        ok: false,
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  });

  socket.on("disconnect", () => {
    openConversationService.closeAllForSocket(socket.id);

    const becameOffline = presenceService.removeSocket(userId, socket.id);

    if (becameOffline) {
      socket.broadcast.emit("user_offline", {
        userId: userId.toString(),
        username,
      });
    }
  });
};

const initSocket = (server) => {
  const { Server } = require("socket.io");
  const socketAuth = require("../middleware/socketAuth.middleware");

  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, socket.user.username);
    registerChatHandlers(io, socket);
  });

  return io;
};

module.exports = initSocket;
module.exports.registerChatHandlers = registerChatHandlers;
