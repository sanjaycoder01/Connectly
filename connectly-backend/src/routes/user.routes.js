const express = require("express");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateSearchUsers } = require("../middleware/validation.middleware");
const { searchLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.get("/me", protect, userController.getMe);
router.get("/", protect, searchLimiter, validateSearchUsers, userController.getUsers);

module.exports = router;
