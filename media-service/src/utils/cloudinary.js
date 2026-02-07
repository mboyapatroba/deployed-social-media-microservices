const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//cloudinary.uploader.upload_stream(options, callback) DOES NOT RETURN A PROMISE
//So you need to manually convert the callback into a Promise.
//upload_stream is a Cloudinary server-side method used to upload files as a stream of bytes, instead of uploading from a file path.
const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error("Error while uploading media to cloudinary", error);
          reject(error);
        } else {
          resolve(result);
        }
      },
    );
    uploadStream.end(file.buffer); //the file is the parameter above Sends the data to Cloudinary Signals “upload finished” Without it:Upload never completes:Promise never resolves
  });
};

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media deleted successfully", publicId);
    return result;
  } catch (error) {
    logger.error("Error deleting media from cloudinary", error);
    throw error;
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
