const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn("Access attempted without userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required please login to continue",
    });
  }
  req.user = { userId: userId };
  next();
};

module.exports = {authenticateRequest};
