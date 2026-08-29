const express = require("express");
const {
  createMessage,
} = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createMessage);

module.exports = router;
