let socket = io.connect();

function submitSentence() {
    const userInput = document.getElementById('userInput').value;
    socket.emit('submitSentence', userInput);
    document.getElementById('userInput').value = ''; // Clear the input field after sending
}

socket.on('newSentence', function(sentence) {
    const submissionsDiv = document.getElementById('submissions');
    const sentenceDiv = document.createElement('div');
    sentenceDiv.textContent = sentence;
    submissionsDiv.appendChild(sentenceDiv);
});

// Update user count directly via Socket.IO
socket.on('userCount', (count) => {
    document.getElementById('userCount').textContent = `${count} other(s)`;
});
