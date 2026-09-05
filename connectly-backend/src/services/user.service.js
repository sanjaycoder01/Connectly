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

const searchUsers = async (currentUserId, query = "") => {
  const filter = { _id: { $ne: currentUserId } };

  if (query && query.trim()) {
    const regex = new RegExp(query.trim(), "i");
    filter.$or = [{ username: regex }, { email: regex }];
  }

  // Newest first so recently registered users appear in the default list.
  // Without sort + limit(20), Mongo returns oldest docs and new accounts are hidden.
  const users = await User.find(filter).sort({ createdAt: -1 });
  return users.map((user) => user.toPublicJSON());
};

module.exports = { getUserById, searchUsers };
