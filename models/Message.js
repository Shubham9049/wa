const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    from: String,
    text: String,
    type: { type: String, enum: ["incoming", "outgoing"] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
