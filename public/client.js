let socket = io();

const sketch = (p) => {
    let userColor; // Will be defined on setup

    p.setup = () => {
        let cnv = p.createCanvas(p.windowWidth, p.windowHeight);
        cnv.style('position', 'absolute');
        p.clear();
        userColor = `rgba(${parseInt(p.random(255))}, ${parseInt(p.random(255))}, ${parseInt(p.random(255))}, 0.5)`; // Assign a random semi-transparent color
    };

    p.draw = () => {
        // Drawing logic remains the same
    };

    p.mouseDragged = () => {
        p.stroke(userColor);
        p.strokeWeight(10);
        p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        socket.emit('draw', {
            x: p.mouseX,
            y: p.mouseY,
            px: p.pmouseX,
            py: p.pmouseY,
            color: userColor
        });
    };
};

// Handle drawing from other clients
socket.on('draw', (data) => {
    const p = this;
    if(p){
        p.stroke(data.color);
        p.strokeWeight(10);
        p.line(data.x, data.y, data.px, data.py);
    }
});

// Update user count directly via Socket.IO
socket.on('userCount', (count) => {
    document.getElementById('userCount').textContent = `${count} other(s)`;
});

new p5(sketch);


p.mouseDragged = () => {
    let data = {
        x: p.mouseX,
        y: p.mouseY,
        px: p.pmouseX,
        py: p.pmouseY,
        color: userColor // Ensure this is defined and accessible
    };
    socket.emit('draw', data);

    // Local drawing for immediate feedback
    p.stroke(data.color);
    p.strokeWeight(10);
    p.line(data.x, data.y, data.px, data.py);
};
