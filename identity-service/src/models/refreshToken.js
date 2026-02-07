const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expiresAfterSeconds: 0 });

// An index is a data structure that MongoDB uses to quickly find documents in a collection.
// Index → fast lookup

// TTL index → fast lookup + automatic deletion
// delete after expires at + expiresAfterseconds

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
module.exports = RefreshToken;
