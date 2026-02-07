require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const Redis = require("ioredis");
const connectToDb = require("./db/connectToDb");
const router = require("./routes/media-routes");
const {
  connectRabbitMq,
  publishEvent,
  consumeEvent,
} = require("./utils/rabbitMq");
const {
  handlePostDeletedEvent,
} = require("./eventHandlers/mediaEventHandlers");

const app = express();
const PORT = process.env.PORT || 3003;

// connect to Db
connectToDb();

// create our redis client
const redisClient = new Redis(process.env.REDIS_URL);

//middllewares
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", req.body);
  next();
});

// global rate  limiter this time we wil use just express rate limiter not rate-limiter flexible
const globalRateLimiter = rateLimit({
  windowMs: 1 * 1000, // 1 sec
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Too many requests for ip ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many request",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// rate limiting using express rate limiter for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Too many requests for ip ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(globalRateLimiter);
app.use("/api/media/upload", sensitiveEndpointsLimiter);

app.use("/api/media", router);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMq();

    //consume all events
    await consumeEvent("post.deleted", handlePostDeletedEvent);
    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}
startServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`unhandledRejection at:${promise} reason:${reason}`);
});
