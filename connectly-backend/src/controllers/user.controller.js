const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  res.json({ user });
});

module.exports = { getMe };
