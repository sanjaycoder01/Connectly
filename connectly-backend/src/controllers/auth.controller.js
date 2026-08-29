const authService = require("../services/auth.service");
const { setAuthCookie, clearAuthCookie } = require("../utils/cookie");
const asyncHandler = require("../utils/asyncHandler");

const signup = asyncHandler(async (req, res) => {
  const { user, token } = await authService.signup(req.body);

  setAuthCookie(res, token);

  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);

  setAuthCookie(res, token);

  res.json({ user });
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
});

module.exports = { signup, login, logout };
