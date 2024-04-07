let zIndexCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    let selectedImage = null;
    let startX = 0, startY = 0; // Starting position of the mouse relative to the page

    const imageContainer = document.getElementById('imageContainer');
    imageContainer.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('draggable')) {
            selectedImage = e.target;
            const rect = selectedImage.getBoundingClientRect();
            // Calculate the starting position of the mouse relative to the clicked image
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            // Apply a higher z-index to ensure the selected image is on top
            selectedImage.style.zIndex = 1000;
            selectedImage.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (selectedImage) {
            e.preventDefault();
            // Move the image based on the current mouse position minus the initial offset
            selectedImage.style.left = (e.clientX - startX - imageContainer.offsetLeft) + 'px';
            selectedImage.style.top = (e.clientY - startY - imageContainer.offsetTop) + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
        if (selectedImage) {
            selectedImage.style.cursor = 'grab';
    
            // Increase z-index to put the dragged image on top of others
            zIndexCounter++; // Increment the counter
            selectedImage.style.zIndex = zIndexCounter; // Apply the incremented value
    
            selectedImage = null; // Clear the reference to the selected image
        }
    });
});

document.getElementById('openPageBtn').addEventListener('click', function() {
    // Opens the first link in a new window or tab
    window.open('https://www.oulipo.xyz/where-is-home-for-you/index.html', '_blank', 'width=600,height=400,left=200,top=200,toolbar=no,scrollbars=no,resizable=yes');

    // Opens the second link in a new window or tab
    window.open('Canvas/Cluster 1/qrcode.html', '_blank', 'width=600,height=400,left=250,top=250,toolbar=no,scrollbars=no,resizable=yes');
});

