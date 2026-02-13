const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const users = {}; // socket.id -> username

// --- Socket.io logic ---
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // User sets username
  socket.on("setUsername", (username) => {
    username = (username || "").trim();
    if (!username) username = "Gast" + Math.floor(Math.random() * 1000);
    users[socket.id] = username;

    io.emit("message", { user: "System", text: `${username} joined the chat` });
  });

  // Broadcast message to everyone
  socket.on("sendMessage", (text) => {
    text = (text || "").trim();
    const username = users[socket.id];
    if (!username || !text) return;

    io.emit("message", { user: username, text });
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      io.emit("message", { user: "System", text: `${username} left the chat` });
      delete users[socket.id];
    }
    console.log("Disconnected:", socket.id);
  });
});

// --- Serve frontend ---
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Globaler Chat</title>
<style>
body {margin:0;font-family:Arial,sans-serif;background:#1e1e1e;color:white;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;}
#login {display:flex;flex-direction:column;align-items:center;}
input, button {padding:8px;margin:5px;border-radius:5px;border:none;}
.chat-container {width:400px;height:600px;background:#2c2c2c;display:none;flex-direction:column;border-radius:10px;overflow:hidden;}
.chat-header {padding:15px;background:#3a3a3a;text-align:center;font-weight:bold;}
.messages {flex:1;padding:10px;overflow-y:auto;}
.message {margin-bottom:10px;word-wrap:break-word;}
.username {font-weight:bold;}
.input-area {display:flex;padding:10px;background:#3a3a3a;}
.input-area input {flex:1;border-radius:5px;border:none;padding:8px;}
.input-area button {margin-left:5px;padding:8px 12px;border-radius:5px;border:none;cursor:pointer;}
</style>
</head>
<body>

<div id="login">
  <h2>Globaler Chat</h2>
  <input id="usernameInput" placeholder="Gib deinen Namen ein" autocomplete="off"/>
  <button id="startBtn">Starten</button>
</div>

<div class="chat-container" id="chat">
  <div class="chat-header">Globaler Chat</div>
  <div id="messages" class="messages"></div>
  <div class="input-area">
    <input id="messageInput" placeholder="Gib eine Nachricht ein..." autocomplete="off"/>
    <button id="sendBtn">Senden</button>
  </div>
</div>

<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
const socket = io();
const loginDiv = document.getElementById("login");
const chatDiv = document.getElementById("chat");
const usernameInput = document.getElementById("usernameInput");
const startBtn = document.getElementById("startBtn");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let username = "";

// Start chat after username input
startBtn.addEventListener("click", () => {
  username = usernameInput.value.trim();
  if (!username) {
    alert("Bitte gib einen Namen ein!");
    return;
  }

  loginDiv.style.display = "none";
  chatDiv.style.display = "flex";

  socket.emit("setUsername", username);
});

// Handle incoming messages
socket.on("message", (data) => {
  const msg = document.createElement("div");
  msg.classList.add("message");

  let text = data.text;
  if (data.user === "System") {
    if (text.includes("joined")) text = text.replace("joined","ist dem Chat beigetreten");
    if (text.includes("left")) text = text.replace("left","hat den Chat verlassen");
  }

  msg.innerHTML = "<span class='username'>" + escapeHTML(data.user) + ":</span> " + escapeHTML(text);
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Send message
function sendeNachricht() {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("sendMessage", text);
  messageInput.value = "";
}

sendBtn.addEventListener("click", sendeNachricht);
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendeNachricht();
});

function escapeHTML(text) {
  return text.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
</script>
</body>
</html>`);
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
