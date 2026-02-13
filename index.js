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
  res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Globaler Chat</title>
<style>
body {margin:0;font-family:Arial,sans-serif;background:#1e1e1e;color:white;display:flex;justify-content:center;align-items:center;height:100vh;}
.chat-container {width:400px;height:600px;background:#2c2c2c;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;}
.chat-header {padding:15px;background:#3a3a3a;text-align:center;font-weight:bold;}
.messages {flex:1;padding:10px;overflow-y:auto;}
.message {margin-bottom:10px;word-wrap:break-word;}
.username {font-weight:bold;}
.input-area {display:flex;padding:10px;background:#3a3a3a;}
input {flex:1;padding:8px;border:none;border-radius:5px;outline:none;}
button {margin-left:5px;padding:8px 12px;border:none;border-radius:5px;cursor:pointer;}
</style>
</head>
<body>
<div class="chat-container">
  <div class="chat-header">Globaler Chat</div>
  <div id="messages" class="messages"></div>
  <div class="input-area">
    <input id="messageInput" placeholder="Gib eine Nachricht ein..." autocomplete="off"/>
    <button onclick="sendeNachricht()">Senden</button>
  </div>
</div>
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
const socket = io();
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");

let benutzername = prompt("Bitte wähle deinen Benutzernamen:") || "Gast" + Math.floor(Math.random()*1000);
socket.emit("setUsername", benutzername);

socket.on("message", data => {
  const msg = document.createElement("div");
  msg.classList.add("message");
  let text = data.text;
  if(data.user==="System"){
    if(text.includes("joined")) text = text.replace("joined","ist dem Chat beigetreten");
    if(text.includes("left")) text = text.replace("left","hat den Chat verlassen");
  }
  msg.innerHTML = "<span class='username'>" + escapeHTML(data.user) + ":</span> " + escapeHTML(text);
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

function sendeNachricht(){
  const text = input.value.trim();
  if(!text) return;
  socket.emit("sendMessage", text);
  input.value="";
}

window.sendeNachricht = sendeNachricht;

input.addEventListener("keypress", e => {
  if(e.key==="Enter") sendeNachricht();
});

function escapeHTML(text){
  return text.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

