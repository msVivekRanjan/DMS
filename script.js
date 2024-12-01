export default function initializeDistractionMonitoring() {
    // Initialize HTML structure
    document.body.innerHTML = `
      <h1>Distraction Monitoring</h1>
      <p id="status">Status: Initializing...</p>
      <p id="details">Details: Setting up camera...</p>
      <video id="video" width="640" height="480" autoplay muted></video>
      <canvas id="canvas" width="640" height="480"></canvas>
      <p id="debug">Debug: </p>
    `;
  
    // Add required libraries
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs",
      "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
      "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils"
    ];
  
    let loadedScripts = 0;
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedScripts++;
        if (loadedScripts === scripts.length) {
          initializeApp();
        }
      };
      document.head.appendChild(script);
    });
  
    function initializeApp() {
      const video = document.getElementById("video");
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      const statusElement = document.getElementById("status");
      const detailsElement = document.getElementById("details");
      const debugElement = document.getElementById("debug");
  
      const eyeClosureThreshold = 0.15;
      const sideViewThreshold = 0.6;
      const blinkDuration = 300;
      let lastAlertTime = 0;
      let lastBlinkTime = 0;
      let eyesClosed = false;
  
      debugElement.textContent += "Initializing FaceMesh... ";
  
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
  
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
  
      faceMesh.onResults(onResults);
  
      debugElement.textContent += "Done. Initializing camera... ";
  
      const camera = new Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
        },
        width: 640,
        height: 480
      });
  
      camera.start()
        .then(() => {
          console.log("Camera started successfully");
          statusElement.textContent = "Status: Camera initialized";
          detailsElement.textContent = "Details: Waiting for face detection...";
          debugElement.textContent += "Camera started. Waiting for face detection...";
        })
        .catch(error => {
          console.error("Error starting camera:", error);
          statusElement.textContent = "Status: Camera error";
          detailsElement.textContent = "Details: Failed to initialize camera. Please check permissions.";
          debugElement.textContent += `Camera error: ${error.message}`;
        });
  
      function onResults(results) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          drawLandmarks(ctx, landmarks);
  
          const leftEyeRatio = calculateEyeAspectRatio(landmarks, [159, 145, 33, 133, 160, 144]);
          const rightEyeRatio = calculateEyeAspectRatio(landmarks, [386, 374, 362, 263, 387, 373]);
          const averageEyeRatio = (leftEyeRatio + rightEyeRatio) / 2;
  
          const sideways = calculateSidewaysLook(landmarks[6], landmarks[4], landmarks[234], landmarks[454]);
  
          updateStatus(averageEyeRatio, sideways);
          debugElement.textContent = `Debug: Face detected. Eye ratio: ${averageEyeRatio.toFixed(2)}, Sideways: ${sideways.toFixed(2)}`;
        } else {
          statusElement.textContent = "Status: No Face Detected";
          statusElement.style.color = "orange";
          detailsElement.textContent = "Details: Please position your face in front of the camera.";
          detailsElement.style.color = "orange";
          debugElement.textContent = "Debug: No face landmarks detected";
        }
      }
  
      function drawLandmarks(ctx, landmarks) {
        ctx.fillStyle = "green";
        landmarks.forEach(({ x, y }) => {
          const px = x * canvas.width;
          const py = y * canvas.height;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
  
      function calculateEyeAspectRatio(landmarks, indices) {
        const [p1, p2, p3, p4, p5, p6] = indices.map(index => landmarks[index]);
        const vertical1 = euclideanDistance(p2, p6);
        const vertical2 = euclideanDistance(p3, p5);
        const horizontal = euclideanDistance(p1, p4);
        return (vertical1 + vertical2) / (2 * horizontal);
      }
  
      function calculateSidewaysLook(noseTop, noseBottom, leftCheek, rightCheek) {
        const noseVector = {
          x: noseBottom.x - noseTop.x,
          y: noseBottom.y - noseTop.y,
          z: noseBottom.z - noseTop.z
        };
        const cheekVector = {
          x: rightCheek.x - leftCheek.x,
          y: rightCheek.y - leftCheek.y,
          z: rightCheek.z - leftCheek.z
        };
        return 1 - Math.abs(dotProduct(noseVector, cheekVector) / (magnitude(noseVector) * magnitude(cheekVector)));
      }
  
      function updateStatus(eyeRatio, sideways) {
        let distracted = false;
        let message = "Focused";
  
        const now = Date.now();
  
        if (eyeRatio < eyeClosureThreshold) {
          if (!eyesClosed) {
            eyesClosed = true;
            lastBlinkTime = now;
          } else if (now - lastBlinkTime > blinkDuration) {
            message = "Drowsy (Eyes Closed)";
            distracted = true;
          }
        } else {
          eyesClosed = false;
        }
  
        if (sideways > sideViewThreshold) {
          message = "Distracted (Looking Sideways)";
          distracted = false;
        }
  
        if (distracted) {
          statusElement.textContent = "Status: Distracted";
          statusElement.style.color = "red";
          detailsElement.textContent = `Details: ${message}`;
          detailsElement.style.color = "red";
  
          if (now - lastAlertTime > 3000) {
            alert(`Warning: ${message}`);
            lastAlertTime = now;
          }
        } else {
          statusElement.textContent = "Status: Focused";
          statusElement.style.color = "green";
          detailsElement.textContent = "Details: Face Detected";
          detailsElement.style.color = "blue";
        }
      }
  
      function euclideanDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
      }
  
      function dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      }
  
      function magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      }
    }
  
    console.log("Distraction Monitoring script loaded successfully.");
  }
  
  initializeDistractionMonitoring();
  
  