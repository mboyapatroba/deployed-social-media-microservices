const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    logger.info("MongoDb Connected Successfully");
  } catch (error) {
    logger.error("Failed to connect to MongoDb", error);
    process.exit(1);
  }
};

module.exports = connectToDb;
