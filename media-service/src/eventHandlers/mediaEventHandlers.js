const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
// this is the function called inside the consume and the message data passed to it

// event here holds the messageContent object beacause it is called with it as a callback in the consume method
const handlePostDeletedEvent = async (event) => {
  console.log(event, "eventeventevent");

  const { postId, mediaIds } = event;
  try {
    const mediasToDelete = await Media.find({ _id: { $in: mediaIds } }); //Find all documents whose _id is in this array.”
    //Returns a Promise, which resolves to an array of documents
    for (const media of mediasToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);

      logger.info(
        `Deleted media ${media._id} associated with this deleted post${postId}`,
      );
    }
    logger.info(`Completion of deletion of medias for postId:${postId}`);
  } catch (error) {
    logger.error("Error occured during media deletion", error);
  }
};

module.exports = { handlePostDeletedEvent };
