const express = require("express");
const {
  createMessage,
  getMessages,
} = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/:conversationId", protect, getMessages);
router.post("/", protect, createMessage);

module.exports = router;
