require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { errorHandler } = require("./middlewares/errorHandler");
const connectToDb = require("./dbConnection/db");
const logger = require("./utils/logger");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const postRoutes = require("./routes/post-routes");
const { connectRabbitMq } = require("./utils/rabbitMq");

const PORT = process.env.PORT || 3002;

//db connection
connectToDb();

// redis client
const redisClient = new Redis(process.env.REDIS_URL);

//middlewares
app.use(express.json());
app.use(helmet());
app.use(cors());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", req.body);
  next();
});

//general limiter  for normal routes you can use express rate limiter or even rate-limiter-flexible
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, //max requests
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

// IP based ratelimiting for sensitive routes
const sensitiveEndpointsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ip ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/posts/create-post", sensitiveEndpointsRateLimiter);
app.use("/api/posts/get-posts", sensitiveEndpointsRateLimiter);

// routes => pass redisClient to routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient; // Without this, the route handlers in postRoutes would have no access to Redis in req.redisClient
    next();
  },
  postRoutes,
);
app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMq();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to Server", error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`unhandledRejection at:${promise} reason:${reason}`);
});
