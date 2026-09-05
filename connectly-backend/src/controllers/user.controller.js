const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  res.json({ user });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await userService.searchUsers(req.user._id, req.query.search || "");
  res.json({ users });
});

module.exports = { getMe, getUsers };
