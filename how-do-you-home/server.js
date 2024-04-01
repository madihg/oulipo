const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let userCount = 0;

app.use(express.static("public")); // Serve static files from 'public' directory

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("submitSentence", (sentence) => {
    // Broadcast the sentence to all clients, including the sender
    io.emit("newSentence", sentence);
  });

  userCount++;
  io.emit("userCount", userCount);

  socket.on("disconnect", () => {
    userCount--;
    io.emit("userCount", userCount);
  });
});
