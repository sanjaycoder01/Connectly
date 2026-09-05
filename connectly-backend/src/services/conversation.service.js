const Conversation = require("../models/Conversation");
const openConversationService = require("./openConversation.service");
const presenceService = require("./presence.service");

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

const getUnreadCount = (conversation, userId) => {
  if (!conversation?.unreadCounts) {
    return 0;
  }

  const key = userId.toString();

  if (conversation.unreadCounts instanceof Map) {
    return conversation.unreadCounts.get(key) || 0;
  }

  return conversation.unreadCounts[key] || 0;
};

const formatConversation = (conversation, userId) => {
  const plain =
    typeof conversation.toObject === "function"
      ? conversation.toObject()
      : { ...conversation };

  const unreadCounts = plain.unreadCounts;
  let unreadMap = {};

  if (unreadCounts instanceof Map) {
    unreadMap = Object.fromEntries(unreadCounts);
  } else if (unreadCounts && typeof unreadCounts === "object") {
    unreadMap = unreadCounts;
  }

  return {
    ...plain,
    unreadCounts: undefined,
    unreadCount: unreadMap[userId.toString()] || 0,
    participants: (plain.participants || []).map((participant) => {
      if (!participant || typeof participant !== "object") {
        return participant;
      }

      const id = participant._id?.toString() || participant.id?.toString();

      return {
        ...participant,
        isOnline: id ? presenceService.isOnline(id) : false,
      };
    }),
  };
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
    unreadCounts: new Map([
      [userId.toString(), 0],
      [participantId.toString(), 0],
    ]),
  });

  return conversation;
};

const getUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate("participants", "username email")
    .sort({ updatedAt: -1 });

  return conversations.map((conversation) =>
    formatConversation(conversation, userId)
  );
};

const incrementUnreadForClosedParticipants = async (
  conversation,
  senderId
) => {
  const sender = senderId.toString();
  const conversationId = conversation._id.toString();
  const ops = {};

  for (const participant of conversation.participants) {
    const participantId = participant.toString();

    if (participantId === sender) {
      continue;
    }

    // Only increment when the recipient does not currently have the chat open.
    if (!openConversationService.isOpen(conversationId, participantId)) {
      ops[`unreadCounts.${participantId}`] = 1;
    }
  }

  if (Object.keys(ops).length === 0) {
    return;
  }

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $inc: ops,
      $set: { updatedAt: new Date() },
    }
  );
};

const resetUnread = async (conversationId, userId) => {
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        [`unreadCounts.${userId.toString()}`]: 0,
      },
    }
  );
};

module.exports = {
  assertParticipant,
  createOrGetConversation,
  getUserConversations,
  formatConversation,
  getUnreadCount,
  incrementUnreadForClosedParticipants,
  resetUnread,
};
