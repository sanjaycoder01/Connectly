const express = require("express");
const {
  createConversation,
  getConversations,
} = require("../controllers/conversation.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  validateCreateConversation,
} = require("../middleware/validation.middleware");

const router = express.Router();

router.get("/", protect, getConversations);
router.post("/", protect, validateCreateConversation, createConversation);

module.exports = router;
