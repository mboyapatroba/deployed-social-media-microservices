const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/refreshToken");
const generateToken = async (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      userName: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "60m" },
  );
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt: expiresAt,
  });

  return { accessToken, refreshToken };
};

module.exports = generateToken;

// expiresAt.getDate() → gets the day of the month (e.g., 16 if today is the 16th).
// + 7 → adds 7 days.
