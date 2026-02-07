const Joi = require("joi");

const validateCreatePost = (data) => {
  const schema = Joi.object({
    content: Joi.string().min(3).max(500).required(),
    mediaIds: Joi.array(),
  });
  return schema.validate(data, { abortEarly: false });
};

module.exports = { validateCreatePost };

// // result is always an object with two main properties:
// // {
//   value: ..., // the validated and possibly cast/sanitized data
//   error: ...  // validation error if validation failed, otherwise undefined
// }
