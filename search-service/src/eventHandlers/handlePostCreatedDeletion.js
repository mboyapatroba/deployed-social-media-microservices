const logger = require("../utils/logger");
const { redisClient } = require("../utils/redisClient");
const SearchPost = require("../models/searchPost");

// Invalidate cache
async function invalidateCache() {
  try {
    const keys = await redisClient.get("posts:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Invalidated ${keys.length} search cache keys`);
    }
  } catch (error) {
    logger.error("Error invalidating search cache", error);
  }
}

const handlePostCreatedEvent = async (messageFromPostService) => {
  try {
    const newSearchPost = new SearchPost({
      postId: messageFromPostService.postId,
      userId: messageFromPostService.userId,
      content: messageFromPostService.content,
      createdAt: messageFromPostService.createdAt,
    });
    await newSearchPost.save();
    logger.info(
      `Search Post created ${messageFromPostService.postId}, ${newSearchPost._id.toString()}`,
    );
    // invalidate cache
    await invalidateCache();
  } catch (error) {
    logger.error("Error handling post created event", error);
  }
};

const handlePostDeletedEvent = async (messageFromPostService) => {
  try {
    const { postId } = messageFromPostService;
    const searchPostToDelete = await SearchPost.findOneAndDelete({
      postId: postId,
    });
    logger.info(`Search Post Deleted ${postId}`);
    
    if (!searchPostToDelete) {
      logger.error("Search post not found ");
    }
    await invalidateCache();
  } catch (error) {
    logger.error("Error handling post deletion event", error);
  }
};

module.exports = { handlePostCreatedEvent, handlePostDeletedEvent };
