const express = require("express");
const authController = require("../controllers/auth.controller");
const {
  validateSignup,
  validateLogin,
} = require("../middleware/validation.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/signup", authLimiter, validateSignup, authController.signup);
router.post("/login", authLimiter, validateLogin, authController.login);
router.post("/logout", authController.logout);

module.exports = router;
