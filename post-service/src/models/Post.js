const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      // stores id of the user who created the post
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, 
    },
    content: {
      //stores the text content of the post
      type: String,
      required: true,
    },
    mediaIds: [
      //Array of strings storing URLs to media (images, videos) attached to the post
      {
        type: String,
      },
    ],
    createdAt: {
      //Stores when the post was created
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }, //Adds two automatic fields: createdAt UpdatedAt
);

// because we will be having a different service for search we can skip this part will not making any harm being here
postSchema.index({ content: "text" }); //Allows full-text search on the content field

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
