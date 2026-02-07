const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshTokenCreationEndpoint,
  logOutUser,
} = require("../controllers/identityController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshTokenCreationEndpoint);
router.post("/logout", logOutUser);

module.exports = router;
