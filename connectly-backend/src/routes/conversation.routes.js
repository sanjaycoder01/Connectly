const express = require("express");
const {
  createConversation,
  getConversations,
} = require("../controllers/conversation.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getConversations);
router.post("/", protect, createConversation);

module.exports = router;
