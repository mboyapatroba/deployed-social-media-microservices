const Post = require("../models/Post");
const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitMq");

// when create a new post we need to always invalidate the cache so that db gets to query it
// and make it available in cache

// Redis only forgets what you explicitly tell it to forget, or what expires
//// Invalidate cache: deletes the single post key (post:<id>) and all paginated list keys (posts:*); all other single post caches remain until TTL expires

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  const keys = await req.redisClient.keys("posts:*"); //gives array of keys that start with posts
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  try {
    logger.info("Create post endpoint hit");
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;

    const newlyCreatedPost = new Post({
      user: req.user.userId, // from jwt payload in api gateway
      content: content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();
    // create a post created event that should be consumed by the search service

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });
    // delete posts in cache
    await invalidatePostCache(req, newlyCreatedPost._id);

    logger.info("Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error creating a post");
    res.status(500).json({
      success: false,
      message: "Error creating a post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // sorting
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Before I hit the database, check Redis cache if posts are there get them
    // when you set limit to 5 page 1 key will be "posts:1:5" next when you query limit 4 page 1 will be "posts:1:4" so redis checks cache based on key thats there if not proceed to db
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts)); //Because Redis only stores strings must convert it to js object then express sends it as json
    }

    // posts key not in cache we move on to query db
    const posts = await Post.find({}).sort(sortObj).skip(skip).limit(limit);
    const totalNumberOfPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalNumberOfPosts / limit);

    if (!posts) {
      return res.status(404).json({
        success: false,
        message: "No posts found",
      });
    }

    const result = {
      posts: posts,
      currentPage: page,
      totalPages: totalPages,
      totalNumberOfPosts: totalNumberOfPosts,
    };

    // save your posts in  redis cache because they were not there
    // setex set the key its value and expiration eg 300 5 mins
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error("Error getting posts");
    res.status(500).json({
      success: false,
      message: "Error getting posts",
    });
  }
};

const getSinglePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    // not in cache query db
    const singlePostById = await Post.findById(postId);

    if (!singlePostById) {
      return res.status(404).json({
        success: false,
        message: "Post not found please try again",
      });
    }

    const result = {
      post: singlePostById,
      success: true,
      message: "Post retrieved successfully",
    };

    // save posts in redis cache // why longer most frequently requested
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(result));

    res.status(200).json(result);
  } catch (error) {
    logger.error("Error getting post by ID");
    res.status(500).json({
      success: false,
      message: "Error getting post by Id",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postToDelete = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!postToDelete) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    // publish post delete method event we are going to consume it in media servic ->
    // when we delete a post send message to rabbit mq media service consumes then deletes post
    await publishEvent("post.deleted", {
      postId: postToDelete._id.toString(),
      userId: req.user.userId,
      mediaIds: postToDelete.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting post");
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, getSinglePost, deletePost };
