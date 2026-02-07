const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const RefreshToken = require("../models/refreshToken");

// User Registration
const registerUser = async (req, res) => {
  try {
    logger.info("Registration endpoint hit....");
    // validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    //check if user exists
    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("Sorry user already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    // create new user
    user = new User({
      username,
      email,
      password,
    });
    await user.save();
    logger.warn("User saved successfully", user._id);

    // generate tokens
    const { accessToken, refreshToken } = await generateToken(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};
// User Login
const loginUser = async (req, res) => {
  try {
    logger.info("Login endpoint hit");
    // validate the shema using joi
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    // check if user exists
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User with the given email not found");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    // valid password or not
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Incorrect password");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    // if valid password generate token and store refresh token in Db
    const { accessToken, refreshToken } = await generateToken(user);
    res.json({
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login failed please try again!", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// Refresh Token
const refreshTokenCreationEndpoint = async (req, res) => {
  try {
    logger.info("Refresh token endpoint hit ");
    //check refresh token sent in body
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh Token missing",
      });
    }
    // if sent in body check if refreshtoken document available in Db and check expiration
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    // load or get user
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // generate new token
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    //delete the old refresh token (the document)
    await RefreshToken.deleteOne({ _id: storedToken._id });
    //return new access anf refresh tokens
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh Token error occurred", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// User Logout

const logOutUser = async (req, res) => {
  try {
    logger.info("Log out endpoint hit");
    // extract refresh token
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(401).json({
        success: false,
        message: "Missing refresh token",
      });
    }
    //delete it from DB
    await RefreshToken.deleteOne({ token: refreahToken });
    logger.info("Refresh Token deleted for logout");
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error while logging out", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// change password logic

module.exports = {
  registerUser,
  loginUser,
  refreshTokenCreationEndpoint,
  logOutUser,
};
