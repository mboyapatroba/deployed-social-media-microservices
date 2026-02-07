require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const { validateToken } = require("./middleware/authmiddleware");

// // RULE OF THUMB
// Reading headers: always lowercase (req.headers['content-type'])
// Writing headers in outgoing requests: either is fine

const app = express();
const PORT = process.env.PORT || 3000;

//redis client
const redisClient = new Redis(process.env.REDIS_URL);
//middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

//rate limiting
const myRateLimitter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

app.use(myRateLimitter);

//logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

//-------------------- setting up proxy for our identity service----------------------------------
//create our proxy
const proxyOptionsForIdentityService = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api"); //replace /v1 with /api  andreturn the updated url
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: `Internal Server error`,
      error: err.message,
    });
  },
  // proxyReqBodyDecorator: (bodyContent, srcReq) => {
  //   return JSON.stringify(bodyContent);
  // },
};

// proxy(forward here, exactly at this endpoint + error if exists)?”
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptionsForIdentityService,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from identity service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
); //v1 will be replaced by /api  v1 is important for api versioning

//-------------------- setting up proxy for our identity service----------------------------------

//--------------------- setting up proxy for our post service---------------------------------------
proxyOptionsForPostService = {
  proxyReqPathResolver: (req) => {
    // Rewrite /v1/auth/... to /api/auth/... in the Identity Service
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error ${err.message}`);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["Content-Type"] = "application/json"; // tells target service we are sending json
    proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; // getting userId from req.user
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Post service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
};

app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, proxyOptionsForPostService),
);
//--------------------- setting up proxy for our post service---------------------------------------

//----------------setting up proxy for our media service---------------------------------

const proxyOptionsForMediaService = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error ${err.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    //srcReq -> incoming request
    //Modifies the request options before sending to Media Service.
    // incoming request header are always small letters
    proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
    if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
      proxyReqOpts.headers["Content-Type"] = "application/json";
    }
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    //Called after the proxied service responds, but before sending back to the client
    logger.info(`Response received from Media service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
  parseReqBody: false, //The proxy forwards the raw incoming request stream to the Media Service
  //critical for forwarding raw file streams safely it does not try parsing it to json
  // default is true
};

app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, proxyOptionsForMediaService),
);
//----------------setting up proxy for our media service---------------------------------

//----------------setting up proxy for our sEARCH service---------------------------------

const proxyOptionsForSearchService = {
  proxyReqPathResolver: (req) => {
    // Rewrite /v1/auth/... to /api/auth/... in the Identity Service
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error ${err.message}`);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["Content-Type"] = "application/json"; // tells target service we are sending json
    proxyReqOpts.headers["x-user-id"] = srcReq.user.userId; // getting userId from req.user
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(
      `Response received from Search service: ${proxyRes.statusCode}`,
    );
    return proxyResData;
  },
};
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, proxyOptionsForSearchService),
);
//----------------setting up proxy for our search service---------------------------------

//errorhandler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`api-gateway running on port ${PORT}`);
  logger.info(
    `identity service is running on ${process.env.IDENTITY_SERVICE_URL}`,
  );
  logger.info(`Post service is running on ${process.env.POST_SERVICE_URL}`);
  logger.info(`Media service is running on ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`Search service is running on ${process.env.SEARCH_SERVICE_URL}`);
  logger.info(`Redis Url ${process.env.REDIS_URL}`);
});

// How the forwarding will work

// api-gateway -> /v1/auth/register -> 3000
// identity    -> /api/auth/register -> 3001

// localhost:3000/v1/auth/register -> localhost:3001/api/auth/register

// req.url is relative to the mounted path (/users stripped off)

// req.originalUrl is the full path the client requested

// | Property          | Description                           | Example value                    |
// | ----------------- | ------------------------------------- | -------------------------------- |
// | `req.url`         | URL **relative** to the mounted route | `/123/profile?active=true`       |
// | `req.originalUrl` | The **full original** URL from client | `/users/123/profile?active=true` |
