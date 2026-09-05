const express = require("express");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", protect, userController.getMe);
router.get("/", protect, userController.getUsers);

module.exports = router;
