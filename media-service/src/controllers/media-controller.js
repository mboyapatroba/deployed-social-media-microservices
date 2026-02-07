const logger = require("../utils/logger");
const Media = require("../models/Media");
const {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
} = require("../utils/cloudinary");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");

  // req.file/ req.files only exists if you use a file upload middleware eg multer
  try {
    // console.log(req.file); for debugging
    if (!req.file) {
      logger.error("No file found! Please try adding a file and try again");
      return res.status(400).json({
        success: false,
        message: "No file found! Please try adding a file and try again",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`file details: name:${originalname} type:${mimetype}`);
    logger.info("Uploading to cloudinary");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfull -> PublicId:${cloudinaryUploadResult.public_id}`,
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId: userId,
    });

    await newlyCreatedMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media uploaded Successfully",
    });
  } catch (error) {
    logger.error("Error saving media", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file please try again",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const allMedia = await Media.find({});
    res.json({ allMedia });
  } catch (errr) {
    res.status(500).json({
      success: false,
      message: "Error retrieving all media",
    });
  }
};

module.exports = { uploadMedia, getAllMedia };

// req.file when using multer
// {
//   "fieldname": "file",        // The name of the input field
//   "originalname": "myphoto.png", // Original file name on client
//   "encoding": "7bit",
//   "mimetype": "image/png",    // File MIME type
//   "size": 102400,             // File size in bytes
//   "buffer": "<Buffer ...>"    // File data (if using memoryStorage)
//   "path": "/uploads/myphoto.png" // File path (if using diskStorage)
// }
