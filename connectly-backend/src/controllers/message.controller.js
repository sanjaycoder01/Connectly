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

module.exports = {
  createMessage,
};
