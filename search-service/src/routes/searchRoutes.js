const express = require("express");
const { searchPostController } = require("../controllers/searchController");
const router = express.Router();
const { authenticateRequest } = require("../middlewares/authMiddleware");

router.use(authenticateRequest);
router.get("/posts", searchPostController);

module.exports = router;
