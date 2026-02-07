const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // pre runs before the document is saved
  if (this.isModified("password")) {
    //this here refers to the document
    try {
      this.password = await argon2.hash(this.password);
    } catch (error) {
      return next(error); //jumps to error handling middleware
    }
  }
});

userSchema.methods.comparePassword = async function (candidatepassword) {
  //,methods adds a method that runs on the document
  try {
    return await argon2.verify(this.password, candidatepassword); // true if password matches false otherwise
  } catch (error) {
    throw error;
  }
};

userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);
module.exports = User;













// ======= Mongoose Index Quick Notes =======

// 1️⃣ Unique index on a field
// Ensures no duplicate emails and improves query performance
// userSchema.index({ email: 1 }, { unique: true });
// - 1 = ascending order
// - unique: true prevents duplicates
// Example: User.findOne({ email: "alice@example.com" })

// 2️⃣ Text index on a field
// Used for full-text search in MongoDB
// userSchema.index({ username: "text" });
// - Allows $text queries for search
// - Only one text index per collection, can include multiple fields
// - Cannot combine with unique
// Example: User.find({ $text: { $search: "Alice" } })

// 3️⃣ Multi-field text index
// userSchema.index({ username: "text", bio: "text" });
// - Searches both username and bio fields
// - Supports phrase search, stemming, relevance scoring

// ⚠️ Notes:
// - Unique index = data integrity + fast equality search
// - Text index = full-text search only
// - Can combine unique + non-text indexes in same schema
