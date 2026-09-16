const express = require("express");
const {
  createMessage,
  getMessages,
} = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  validateCreateMessage,
  validateGetMessages,
} = require("../middleware/validation.middleware");
const { messageLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.get("/:conversationId", protect, validateGetMessages, getMessages);
router.post("/", protect, messageLimiter, validateCreateMessage, createMessage);

module.exports = router;
