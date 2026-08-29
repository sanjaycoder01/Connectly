const User = require("../models/User");
const { signToken } = require("../utils/jwt");

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const signup = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw new AuthError("Username, email, and password are required");
  }

  if (password.length < 6) {
    throw new AuthError("Password must be at least 6 characters");
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existingUser) {
    throw new AuthError("Email or username already in use", 409);
  }

  const user = await User.create({ username, email, password });
  const token = signToken(user._id);

  return { user: user.toPublicJSON(), token };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AuthError("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AuthError("Invalid email or password", 401);
  }

  const token = signToken(user._id);

  return { user: user.toPublicJSON(), token };
};

module.exports = { signup, login, AuthError };
