const mongoose = require("mongoose");

const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id.trim()) && mongoose.Types.ObjectId.isValid(id.trim());
};

const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.trim().length <= 120;
};

const isValidUsername = (username) => {
  if (!username || typeof username !== "string") return false;
  const trimmed = username.trim();
  // Alphanumeric with underscores and hyphens, 2 to 30 characters
  return /^[a-zA-Z0-9_-]{2,30}$/.test(trimmed);
};

const isValidPassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= 6 && password.length <= 128;
};

const escapeRegex = (text) => {
  if (!text || typeof text !== "string") return "";
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const validateSignup = (req, res, next) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({
      message: "Username, email, and password are required",
    });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({
      message:
        "Username must be between 2 and 30 characters and contain only letters, numbers, hyphens, and underscores",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: "Password must be between 6 and 128 characters",
    });
  }

  req.body.username = username.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

const validateSearchUsers = (req, res, next) => {
  const search = req.query.search;

  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({
      message: "Search query must be a string",
    });
  }

  if (typeof search === "string") {
    // Truncate query to 50 characters to prevent abuse
    req.query.search = search.slice(0, 50);
  }

  next();
};

const validateCreateConversation = (req, res, next) => {
  const { participantId } = req.body || {};

  if (!participantId) {
    return res.status(400).json({
      message: "participantId is required",
    });
  }

  if (!isValidObjectId(participantId)) {
    return res.status(400).json({
      message: "Invalid participantId format",
    });
  }

  if (req.user && req.user._id.toString() === participantId.toString()) {
    return res.status(400).json({
      message: "Cannot create conversation with yourself",
    });
  }

  next();
};

const validateCreateMessage = (req, res, next) => {
  const { conversationId, content, clientMessageId } = req.body || {};

  if (!conversationId || !content) {
    return res.status(400).json({
      message: "conversationId and content are required",
    });
  }

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({
      message: "Invalid conversationId format",
    });
  }

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({
      message: "Message content cannot be empty",
    });
  }

  if (content.trim().length > 5000) {
    return res.status(400).json({
      message: "Message content cannot exceed 5000 characters",
    });
  }

  if (clientMessageId && (typeof clientMessageId !== "string" || clientMessageId.length > 100)) {
    return res.status(400).json({
      message: "clientMessageId must be a string under 100 characters",
    });
  }

  req.body.content = content.trim();
  if (clientMessageId) {
    req.body.clientMessageId = clientMessageId.trim();
  }

  next();
};

const validateGetMessages = (req, res, next) => {
  const { conversationId } = req.params;
  const { limit, cursor } = req.query;

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({
      message: "Invalid conversationId format",
    });
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        message: "Limit must be a number between 1 and 100",
      });
    }
  }

  if (cursor && !isValidObjectId(cursor)) {
    return res.status(400).json({
      message: "Invalid cursor format",
    });
  }

  next();
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidUsername,
  isValidPassword,
  escapeRegex,
  validateSignup,
  validateLogin,
  validateSearchUsers,
  validateCreateConversation,
  validateCreateMessage,
  validateGetMessages,
};
