let socket = io.connect();
let userColor = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`; // Unique color for each user

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.style('position', 'absolute');
    cnv.style('z-index', '2'); // Ensure canvas is above the background image
    background(255, 255, 255, 0); // Transparent background

    // Drawing received from server
    socket.on('draw', function(data) {
        stroke(data.color);
        strokeWeight(10);
        line(data.x, data.y, data.px, data.py);
    });

    // Update user count
    socket.on('userCount', function(count) {
        document.getElementById('user-count').textContent = `${count} other(s)`;
    });
}

function mouseDragged() {
    // Send this user's drawing data to the server
    let data = {
        x: mouseX,
        y: mouseY,
        px: pmouseX,
        py: pmouseY,
        color: userColor
    };
    socket.emit('draw', data);

    // Also draw on this user's canvas for immediate feedback
    stroke(userColor);
    strokeWeight(10);
    line(mouseX, mouseY, pmouseX, pmouseY);
}
