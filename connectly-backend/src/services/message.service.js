const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const createMessage = async (conversationId, senderId, content) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
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

  return Message.create({
    conversationId,
    senderId,
    content,
  });
};

module.exports = {
  createMessage,
};
