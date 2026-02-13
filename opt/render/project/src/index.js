const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // change to frontend URL in production
  }
});

const users = {}; // socket.id -> username

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // User sets username
  socket.on("setUsername", (username) => {
    users[socket.id] = username;

    io.emit("message", {
      user: "System",
      text: `${username} joined the chat`
    });
  });

  // Broadcast message to everyone
  socket.on("sendMessage", (text) => {
    const username = users[socket.id];
    if (!username) return;

    io.emit("message", {
      user: username,
      text
    });
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      io.emit("message", {
        user: "System",
        text: `${username} left the chat`
      });
      delete users[socket.id];
    }

    console.log("Disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Global chat server running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
