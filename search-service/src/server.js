require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const connectToDb = require("./dbConnection/db");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorHandler");
const { connectRabbitMq, consumeEvent } = require("./utils/rabbitMq");
const searchRoutes = require("./routes/searchRoutes");
const {
  handlePostCreatedEvent,
  handlePostDeletedEvent,
} = require("./eventHandlers/handlePostCreatedDeletion");
const { redisClient } = require("./utils/redisClient");

const app = express();

const PORT = process.env.PORT || 3004;

// connect to Db
connectToDb();

// connect to redis client done in utils

//use middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", req.body);
  next();
});

//all  route rate limiting
const allRouteRateLimiter = rateLimit({
  windowMs: 1000 * 60 * 15,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ip ${req.ip}`);
    res.status(429).json({
      sucess: false,
      message: "Too many request ",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  //   “Don’t store counters in memory.
  // Store them in Redis instead.
});

app.use(allRouteRateLimiter);

// ***Home work add redis caching pass redisClient in request also invalidate cache
// after creation and deletion

app.use(
  "/api/search",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  searchRoutes,
);

// error hanlder middleware
app.use(errorHandler);

// start sever
async function startServer() {
  try {
    await connectRabbitMq();
    //consume all events or subscribe to the events
    await consumeEvent("post.created", handlePostCreatedEvent); //if post created make it avalable in searchpost collection
    await consumeEvent("post.deleted", handlePostDeletedEvent); //if post deleted remove it from  searchpost collection

    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}
startServer();

// unHandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`unhandledRejection at:${promise} reason:${reason}`);
});
