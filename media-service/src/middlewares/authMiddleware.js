const logger = require("../utils/logger");

const authenticateRequest = async (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn("Access attempted without userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required please try again",
    });
  }
  req.user = { userId: userId };
  next();
};

module.exports = {authenticateRequest};
