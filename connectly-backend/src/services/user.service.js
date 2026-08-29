const User = require("../models/User");

const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user.toPublicJSON();
};

module.exports = { getUserById };
