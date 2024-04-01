const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let userCount = 0;

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

io.on('connection', (socket) => {
    userCount++;
    io.emit('userCount', userCount);

    socket.on('disconnect', () => {
        userCount--;
        io.emit('userCount', userCount);
    });

    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data); // Send the drawing data to all clients except the sender
    });
});
