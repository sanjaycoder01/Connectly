const messageService = require("../services/message.service");

const createMessage = async (req, res, next) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;

    if (!conversationId || !content) {
      return res.status(400).json({
        message: "conversationId and content are required",
      });
    }

    const message = await messageService.createMessage(
      conversationId,
      senderId,
      content
    );

    return res.status(201).json({
      message,
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { limit, cursor } = req.query;

    const result = await messageService.getConversationMessages(
      conversationId,
      req.user._id,
      { limit, cursor }
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMessage,
  getMessages,
};
