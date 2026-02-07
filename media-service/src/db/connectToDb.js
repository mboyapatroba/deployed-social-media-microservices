const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    logger.info("Successfully connected to MongoDB");
  } catch (error) {
    logger.warn("Error connecting to MongoDb", error);
    process.exit(1);
  }
};

module.exports = connectToDb;
