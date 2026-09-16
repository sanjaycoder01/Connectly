const { isValidObjectId } = require("../middleware/validation.middleware");

const validateJoinConversation = (conversationId) => {
  if (!conversationId || typeof conversationId !== "string") {
    return { ok: false, message: "conversationId is required" };
  }
  if (!isValidObjectId(conversationId)) {
    return { ok: false, message: "Invalid conversationId format" };
  }
  return { ok: true, conversationId: conversationId.trim() };
};

const validateLeaveConversation = (conversationId) => {
  if (!conversationId || typeof conversationId !== "string") {
    return { ok: false, message: "conversationId is required" };
  }
  if (!isValidObjectId(conversationId)) {
    return { ok: false, message: "Invalid conversationId format" };
  }
  return { ok: true, conversationId: conversationId.trim() };
};

const validateSendMessage = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      message: "conversationId, content, and clientMessageId are required",
    };
  }

  const { conversationId, content, clientMessageId } = payload;

  if (!conversationId || !content?.trim() || !clientMessageId?.trim()) {
    return {
      ok: false,
      message: "conversationId, content, and clientMessageId are required",
    };
  }

  if (!isValidObjectId(conversationId)) {
    return { ok: false, message: "Invalid conversationId format" };
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > 5000) {
    return {
      ok: false,
      message: "Message content cannot exceed 5000 characters",
    };
  }

  const trimmedClientId = clientMessageId.trim();
  if (trimmedClientId.length > 100) {
    return {
      ok: false,
      message: "clientMessageId cannot exceed 100 characters",
    };
  }

  return {
    ok: true,
    data: {
      conversationId: conversationId.trim(),
      content: trimmedContent,
      clientMessageId: trimmedClientId,
    },
  };
};

const validateTypingEvent = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "conversationId is required" };
  }

  const { conversationId } = payload;
  if (!conversationId || typeof conversationId !== "string") {
    return { ok: false, message: "conversationId is required" };
  }

  if (!isValidObjectId(conversationId)) {
    return { ok: false, message: "Invalid conversationId format" };
  }

  return { ok: true, conversationId: conversationId.trim() };
};

const validateMessageDelivered = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "messageId is required" };
  }

  const { messageId } = payload;
  if (!messageId || typeof messageId !== "string") {
    return { ok: false, message: "messageId is required" };
  }

  if (!isValidObjectId(messageId)) {
    return { ok: false, message: "Invalid messageId format" };
  }

  return { ok: true, messageId: messageId.trim() };
};

const validateMessageRead = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "conversationId is required" };
  }

  const { conversationId } = payload;
  if (!conversationId || typeof conversationId !== "string") {
    return { ok: false, message: "conversationId is required" };
  }

  if (!isValidObjectId(conversationId)) {
    return { ok: false, message: "Invalid conversationId format" };
  }

  return { ok: true, conversationId: conversationId.trim() };
};

module.exports = {
  validateJoinConversation,
  validateLeaveConversation,
  validateSendMessage,
  validateTypingEvent,
  validateMessageDelivered,
  validateMessageRead,
};
