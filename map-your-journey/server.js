const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 3000, () => console.log('Server running'));
app.use(express.static('public'));

const socket = require('socket.io');
const io = socket(server, {
    cors: { origin: "*" },
});

let userCount = 0;
const colors = ['red', 'green', 'blue', 'purple', 'orange']; // Add more colors as needed

io.on('connection', (socket) => {
    userCount++;
    const userColor = colors[userCount % colors.length]; // Assign a color in a round-robin fashion
    socket.emit('init', { userColor, userCount }); // Send initial data to the newly connected client
    io.emit('userCount', userCount); // Update all clients with the new user count

    socket.on('drawLine', (data) => {
        data.color = userColor; // Attach the user's color to the line data
        socket.broadcast.emit('drawLine', data);
    });

    socket.on('disconnect', () => {
        userCount--;
        io.emit('userCount', userCount); // Update all clients with the new user count
    });
});
