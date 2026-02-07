const express = require("express");
const router = express.Router();
const { authenticateRequest } = require("../middlewares/authMiddleware");
const {
  createPost,
  getAllPosts,
  getSinglePost,
  deletePost,
} = require("../controllers/post-controller");

//protect route middleware will tell if the user is authenticated
// we can do this to apply to all routes
// router.use(authenticateRequest)
router.post("/create-post", authenticateRequest, createPost);
router.get("/get-posts", authenticateRequest, getAllPosts);
router.get("/get-single-post/:id", authenticateRequest, getSinglePost);
router.delete("/delete-post/:id", authenticateRequest, deletePost);

module.exports = router;
