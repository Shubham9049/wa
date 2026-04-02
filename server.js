const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: "*",
  }),
);
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

      let user = await User.findOne({ phone: from });

      if (!user) {
        user = await User.create({
          phone: from,
          name: "User " + from.slice(-4),
        });
      }

      const newMsg = await Message.create({
        user: user._id,
        from: from,
        text: text,
        type: "incoming",
      });

      // 🔥 REAL-TIME EMIT
      io.emit("newMessage", newMsg);

      console.log("📡 Incoming message sent to frontend");
      await sendMessage(from, "Hello 👋 How can we help you?");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.get("/users", async (req, res) => {
  const users = await User.find().sort({ updatedAt: -1 });
  res.json(users);
});

app.get("/messages/:userId", async (req, res) => {
  const messages = await Message.find({
    user: req.params.userId,
  }).sort({ createdAt: 1 });

  res.json(messages);
});

app.post("/send", async (req, res) => {
  const { to, message } = req.body;

  try {
    console.log("📤 Sending to:", to);
    console.log("💬 Message:", message);

    // ✅ Try WhatsApp send (but don't crash)
    try {
      await sendMessage(to, message);
    } catch (err) {
      console.error("❌ WhatsApp Error:", err.response?.data || err.message);
    }

    // ✅ Find or create user
    let user = await User.findOne({ phone: to });

    if (!user) {
      user = await User.create({
        phone: to,
        name: "User " + to.slice(-4),
      });
    }

    // ✅ Save message
    const savedMessage = await Message.create({
      user: user._id,
      from: "business",
      text: message,
      type: "outgoing",
    });

    io.emit("newMessage", savedMessage);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ FINAL ERROR:", err);
    res.status(500).json({ error: err.message });
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

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

// ✅ Socket setup
const io = new Server(server, {
  cors: {
    origin: "*", // later frontend URL dalna
  },
});

// ✅ Connection event
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
