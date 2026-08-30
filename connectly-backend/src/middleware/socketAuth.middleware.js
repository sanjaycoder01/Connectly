const { parseCookie } = require("cookie");
const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

const socketAuth = async (socket, next) => {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie || "");

    const token = cookies.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

module.exports = socketAuth;