const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(), //enables message templating
    winston.format.json()
  ),
  defaultMeta: { service: "identity-service" },
  transports: [
    // output destination
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }), // logs error level
    new winston.transports.File({ filename: "combined.log" }),
    // Write all logs with importance level of `info` or higher to `combined.log`
  ],
});

module.exports = logger;

