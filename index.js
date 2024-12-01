// Create and append necessary elements dynamically
document.body.innerHTML = `
    <h1>Basic Face Detection</h1>
    <p class="message">Face detection will output true if a face-like region is found, otherwise false.</p>
`;

// Create video element
const video = document.createElement('video');
video.id = 'video';
video.autoplay = true;
video.muted = true;
document.body.appendChild(video);

// Create canvas element
const canvas = document.createElement('canvas');
canvas.id = 'canvas';
document.body.appendChild(canvas);

// Create a detection status element
const detectionStatus = document.createElement('p');
detectionStatus.id = 'detection-status';
detectionStatus.textContent = 'Detection Status: False';
detectionStatus.style.fontSize = '20px';
detectionStatus.style.color = 'red';
document.body.appendChild(detectionStatus);

// Create a score element
const scoreDisplay = document.createElement('p');
scoreDisplay.id = 'score';
scoreDisplay.textContent = 'Score: 0';
scoreDisplay.style.fontSize = '20px';
scoreDisplay.style.color = 'blue';
document.body.appendChild(scoreDisplay);

// Get the canvas context with "willReadFrequently" for performance
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Game variables
let score = 0;

// Access the user's webcam
async function startCamera() {
    try {
        // Get the video stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        // When the video is loaded, set canvas size
        video.addEventListener('loadeddata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            detectFace();
        });
    } catch (err) {
        console.error('Error accessing webcam:', err);
        alert('Unable to access your camera. Please ensure permissions are granted.');
    }
}

// Detect face using improved logic
function detectFace() {
    setInterval(() => {
        // Draw the video frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Analyze regions of the frame for face-like patterns
        const regionX = canvas.width / 4;
        const regionY = canvas.height / 4;
        const regionWidth = canvas.width / 2;
        const regionHeight = canvas.height / 2;

        const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
        const pixels = imageData.data;

        let edgeCount = 0;
        let pixelCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Simple edge detection using brightness difference
            const brightness = (r + g + b) / 3;
            if (i > 0) {
                const prevBrightness = (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3;
                if (Math.abs(brightness - prevBrightness) > 20) {
                    edgeCount++;
                }
            }
            pixelCount++;
        }

        // Detection conditions: sufficient edge density in the analyzed region
        const edgeDensity = (edgeCount / pixelCount) * 100;

        if (edgeDensity > 10) {
            showDetection(true);
        } else {
            showDetection(false);
        }
    }, 100);
}

// Update detection status and game score
function showDetection(status) {
    const detectionStatus = document.getElementById('detection-status');
    const scoreDisplay = document.getElementById('score');

    if (status) {
        detectionStatus.textContent = 'Detection Status: True';
        detectionStatus.style.color = 'green';

        // Increment score
        score++;
        scoreDisplay.textContent = `Score: ${score}`;

        // Draw a detection box on the canvas
        const faceX = canvas.width / 4;
        const faceY = canvas.height / 4;
        const faceWidth = canvas.width / 2;
        const faceHeight = canvas.height / 2;

        ctx.beginPath();
        ctx.rect(faceX, faceY, faceWidth, faceHeight);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.stroke();
    } else {
        detectionStatus.textContent = 'Detection Status: False';
        detectionStatus.style.color = 'red';
    }
}

// Start the camera
startCamera();
