const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: "Unknown" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
