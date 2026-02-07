const logger = require("../utils/logger");
const SearchPost = require("../models/searchPost");
const searchPostController = async (req, res) => {
  logger.info("Search Endpoint hit");
  try {
    //before hitting database check cache
    const { query } = req.query;
    const cacheKey = `posts:${query}`;
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    // posts not in cache we hit the database
    const results = await SearchPost.find(
      {
        $text: { $search: query },
      },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    // save the found posts matching query to rediscache best on cache key
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));

    //finally return the posts found matching the query parameter also invalidate the cache
    // in the event handlers when creating or deleting posts
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };

// const { query } = req.query;
//   const result = await SearchPost.find({
//     $text: { $search: query },
//   });

//   It returns documents where:
// Any indexed text field
// Contains words that match query
