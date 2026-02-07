require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const connectToDb = require("./dbConnection/db");
const router = require("./routes/identity-service");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;
// connect to Database
connectToDb();

// create redis client
const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 100, //max requests
  duration: 1, // user can make 10 request in 1 second
});

const allRateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip); // consume requests from this ip
    next(); // next method if ratelimiter is not exceeded
  } catch (error) {
    logger.warn(`Rate Limit exceeds for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }
};
app.use(allRateLimitMiddleware);

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 50, //max requests
  standardHeaders: true, //client know how man request they have left in the available time
  legacyHeaders: false,
  handler: (req, res) => {
    //custom functions that runs when the rate limit is exceeded
    logger.warn(`Sensitive endpoint rate limit exceeded for Ip: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    // sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

//apply this sensitive endpoint limiter to our routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);
app.use("/api/auth/login", sensitiveEndpointsLimiter);
app.use("/api/auth/refresh-token", sensitiveEndpointsLimiter);

//main Routes
app.use("/api/auth", router);

//error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`unhandledRejection at:${promise} reason:${reason}`);
});

// rate-limt-redis doesn't do rate limiting itself
//It provides Redis Storage support for express-rate-limit
