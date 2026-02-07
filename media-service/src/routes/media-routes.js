const express = require("express");
const multer = require("multer");
const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const logger = require("../utils/logger");
const router = express.Router();

//Configure multer for file upload

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file"); //// 'file' is the field name from client-side <input name="file" />
// above return a middleware upload which we call below
router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      //If an error occurs → multer calls next(err) → this callback gets the err.
      // Handle Multer-specific errors
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading", err);
        return res.status(400).json({
          success: false,
          message: "Multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      }
      // Handle other unknown errors
      else if (err) {
        logger.error("Unknown error occurred while uploading", err);
        return res.status(500).json({
          success: false,
          message: "Unknown error occurred while uploading",
          error: err.message,
          stack: err.stack,
        });
      }

      // Check if a file was provided
      if (!req.file) {
        logger.warn("No file found in the request");
        return res.status(400).json({
          success: false,
          message: "No file provided for upload",
        });
      }

      // If everything is fine, continue to next middleware / handler
      next();
    });
  },
  uploadMedia,
);

router.get("/get-all-media", authenticateRequest, getAllMedia);
module.exports = router;





// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 5 * 1024 * 1024 },
// }).single("file");

// What the returned value looks like
// Conceptually:

// function upload(req, res, next) {
//   // parse multipart form
//   // extract file
//   // attach req.file
//   // attach req.body
//   next();

// That’s what upload is.