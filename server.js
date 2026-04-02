const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

connectDB();

// ✅ Webhook Verification
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (req.query["hub.mode"] && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// ✅ Receive Message
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || "";

      // 🔥 1. Find or Create User
      let user = await User.findOne({ phone: from });

      if (!user) {
        user = await User.create({
          phone: from,
          name: "User " + from.slice(-4),
        });
      }

      // 🔥 2. Save Incoming Message
      await Message.create({
        user: user._id,
        from: from,
        text: text,
        type: "incoming",
      });

      console.log("💾 Saved Message:", text);

      // 🔥 3. Auto Reply
      const reply = "Hello 👋 How can we help you?";
      await sendMessage(from, reply);

      // 🔥 4. Save Outgoing Message
      await Message.create({
        user: user._id,
        from: "business",
        text: reply,
        type: "outgoing",
      });
    }
    console.log("🔥 Webhook POST HIT");
    console.log(JSON.stringify(req.body, null, 2));

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ✅ Send Message Function
const sendMessage = async (to, message) => {
  await axios.post(
    `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );
};

app.listen(5000, () => console.log("🚀 Server Running"));
