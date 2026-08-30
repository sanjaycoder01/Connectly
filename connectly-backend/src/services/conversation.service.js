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

const createOrGetConversation = async (userId, participantId) => {
  const participants = [userId.toString(), participantId.toString()].sort();

  let conversation = await Conversation.findOne({
    participants: {
      $all: participants,
    },
  });

  if (conversation) {
    return conversation;
  }

  conversation = await Conversation.create({
    participants,
  });

  return conversation;
};

const getUserConversations = async (userId) => {
  return Conversation.find({
    participants: userId,
  })
    .populate("participants", "username email")
    .sort({ updatedAt: -1 });
};

module.exports = {
  assertParticipant,
  createOrGetConversation,
  getUserConversations,
};
