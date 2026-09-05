const conversationService = require("../services/conversation.service");

const createConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        message: "participantId is required",
      });
    }

    if (userId.toString() === participantId.toString()) {
      return res.status(400).json({
        message: "Cannot create conversation with yourself",
      });
    }

    const conversation =
      await conversationService.createOrGetConversation(
        userId,
        participantId
      );

    return res.status(200).json({
      message: "Conversation ready",
      conversation: conversationService.formatConversation(
        conversation,
        userId
      ),
    });
  } catch (error) {
    next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const conversations = await conversationService.getUserConversations(
      req.user._id
    );

    return res.status(200).json({ conversations });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  getConversations,
};
