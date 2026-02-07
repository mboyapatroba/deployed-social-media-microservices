const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // incoming request header are always small letters

  // If authHeader is undefined or null, the expression returns undefined
  // If authHeader exists, it continues to the next part:
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Access attempt without valid token");
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // decode token
  // you can use try catch block or add the call back field of jwt here we will add callback
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(401).json({
        success: false,
        message: "Invalid Token",
      });
    }
    req.user = user; //attach user payload to req
    next();
  });
};

module.exports = { validateToken };
