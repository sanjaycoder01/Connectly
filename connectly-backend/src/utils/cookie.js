const { nodeEnv } = require("../config/env");

const cookieOptions = {
  httpOnly: true,
  secure: nodeEnv === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, cookieOptions);
};

const clearAuthCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  });
};

module.exports = { setAuthCookie, clearAuthCookie };
