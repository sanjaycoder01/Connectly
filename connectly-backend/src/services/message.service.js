const Message = require("../models/Message");
const { MESSAGE_STATUS } = require("../models/Message");
const Conversation = require("../models/Conversation");
const {
  assertParticipant,
  incrementUnreadForClosedParticipants,
  resetUnread,
} = require("./conversation.service");

const createMessage = async (
  conversationId,
  senderId,
  content,
  clientMessageId
) => {
  const conversation = await assertParticipant(conversationId, senderId);

  if (clientMessageId) {
    const existing = await Message.findOne({
      senderId,
      clientMessageId,
    });

    if (existing) {
      return { message: existing, created: false, conversation };
    }
  }

  try {
    const message = await Message.create({
      conversationId,
      senderId,
      content,
      status: MESSAGE_STATUS.SENT,
      ...(clientMessageId ? { clientMessageId } : {}),
    });

    await incrementUnreadForClosedParticipants(conversation, senderId);
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { updatedAt: new Date() } }
    );

    return { message, created: true, conversation };
  } catch (error) {
    if (error.code === 11000 && clientMessageId) {
      const existing = await Message.findOne({
        senderId,
        clientMessageId,
      });

      if (existing) {
        return { message: existing, created: false, conversation };
      }
    }

    throw error;
  }
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

const markMessageDelivered = async (messageId, userId) => {
  const message = await Message.findById(messageId);

  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  await assertParticipant(message.conversationId, userId);

  if (message.senderId.toString() === userId.toString()) {
    const error = new Error("Sender cannot mark their own message as delivered");
    error.statusCode = 403;
    throw error;
  }

  if (message.status !== MESSAGE_STATUS.SENT) {
    return { message, updated: false };
  }

  message.status = MESSAGE_STATUS.DELIVERED;
  message.deliveredAt = new Date();
  await message.save();

  return { message, updated: true };
};

const markConversationRead = async (conversationId, userId) => {
  await assertParticipant(conversationId, userId);

  const pending = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    status: { $in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] },
  }).select("_id status deliveredAt");

  if (pending.length === 0) {
    await resetUnread(conversationId, userId);
    return { messageIds: [], updated: false };
  }

  const messageIds = pending.map((doc) => doc._id);
  const now = new Date();

  await Message.updateMany(
    { _id: { $in: messageIds } },
    [
      {
        $set: {
          status: MESSAGE_STATUS.READ,
          readAt: now,
          deliveredAt: { $ifNull: ["$deliveredAt", now] },
        },
      },
    ]
  );

  await resetUnread(conversationId, userId);

  return {
    messageIds: messageIds.map((id) => id.toString()),
    updated: true,
    readAt: now,
  };
};

module.exports = {
  createMessage,
  getConversationMessages,
  markMessageDelivered,
  markConversationRead,
};
