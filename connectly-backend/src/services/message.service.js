const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const assertParticipant = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    const exists = await Conversation.exists({ _id: conversationId });

    if (!exists) {
      const error = new Error("Conversation not found");
      error.statusCode = 404;
      throw error;
    }

    const error = new Error("You are not a participant of this conversation");
    error.statusCode = 403;
    throw error;
  }

  return conversation;
};

const createMessage = async (conversationId, senderId, content) => {
  await assertParticipant(conversationId, senderId);

  return Message.create({
    conversationId,
    senderId,
    content,
  });
};

const getConversationMessages = async (
  conversationId,
  userId,
  { limit = 20, cursor } = {}
) => {
  await assertParticipant(conversationId, userId);

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const query = { conversationId };

  if (cursor) {
    const cursorMessage = await Message.findById(cursor);

    if (
      !cursorMessage ||
      cursorMessage.conversationId.toString() !== conversationId.toString()
    ) {
      const error = new Error("Invalid cursor");
      error.statusCode = 400;
      throw error;
    }

    query.createdAt = { $lt: cursorMessage.createdAt };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit + 1);

  const hasMore = messages.length > parsedLimit;
  const page = hasMore ? messages.slice(0, parsedLimit) : messages;
  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]._id.toString() : null;

  return {
    messages: page,
    nextCursor,
    hasMore,
  };
};

module.exports = {
  createMessage,
  getConversationMessages,
};
