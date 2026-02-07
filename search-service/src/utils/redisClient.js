const Redis = require("ioredis");
const logger = require("../utils/logger");
const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
  logger.info("Redis Client connected successfully");
});
redisClient.on("error", (err) => {
  logger.error("Redis Error", err);
});

module.exports = { redisClient };

// What these listeners are NOT

// They are not required to “start Redis”
//  They are not required to “enable Redis”
// They do not change Redis behavior
