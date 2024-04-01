const socket = io();
const mapImage = document.getElementById('map-image');
const svg = document.querySelector('svg');
const userCountElement = document.getElementById('user-count'); // Element to display the number of users
let lastPoint = null; // Store the last point to connect lines
let userColor = '#' + Math.floor(Math.random()*16777215).toString(16); // Generate a random color for the user

// Emit an event to register the user and their color
socket.emit('registerUser', {color: userColor});

mapImage.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastPoint) {
        // Draw line from lastPoint to current point with user's color
        drawLine(lastPoint.x, lastPoint.y, x, y, userColor);
        socket.emit('drawLine', {from: lastPoint, to: {x, y}, color: userColor});
    }
    // Update lastPoint with the current click position
    lastPoint = {x, y};
});

function drawLine(x1, y1, x2, y2, color) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2'); // Set the stroke width
    svg.appendChild(line);
}

socket.on('drawLine', function(data) {
    drawLine(data.from.x, data.from.y, data.to.x, data.to.y, data.color);
});

// Listen for updates on the number of connected users
socket.on('userCount', function(count) {
    userCountElement.textContent = `${count} other(s)`;
});
