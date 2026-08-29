const Conversation = require("../models/Conversation");

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
  createOrGetConversation,
  getUserConversations,
};
