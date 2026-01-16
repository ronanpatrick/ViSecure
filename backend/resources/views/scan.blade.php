<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ViSecure Check-In</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body class="bg-gray-900 text-white flex flex-col items-center justify-center min-h-screen p-4">

    <h1 class="text-2xl font-bold mb-4 text-blue-400">Visitor Check-In</h1>
    
    <div class="relative w-64 h-80 bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800">
        <video id="video" autoplay playsinline class="w-full h-full object-cover transform -scale-x-100"></video>
        <canvas id="canvas" class="hidden"></canvas>
        
        <div class="absolute inset-0 border-2 border-dashed border-blue-400 opacity-50 m-8 rounded-xl pointer-events-none"></div>
    </div>

    <p class="text-gray-400 text-sm mt-4 text-center">
        Position your face in the box
    </p>

    <button id="snap" class="hidden mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg">
        📷 Scan Face
    </button>

    <div id="status" class="mt-4 text-sm font-mono text-yellow-400 hidden">
        <span id="status-message">Verifying Identity...</span>
    </div>

    <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const snap = document.getElementById('snap');
        const status = document.getElementById('status');
        const statusMessage = document.getElementById('status-message');

        // 1. Access the Phone Camera
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => { 
                video.srcObject = stream; 
                
                // START AUTO-CAPTURE LOGIC
                console.log("Camera ready. Auto-snapping in 2 seconds...");
                setTimeout(() => {
                    takeSnapshot();
                }, 2000); 
            })
            .catch(err => { 
                alert("Error accessing camera: " + err); 
            });

        function takeSnapshot() {
            // Visual feedback
            if(status) status.classList.remove('hidden');

            // CHANGED: Force canvas to match video resolution exactly
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw the image full size
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to Base64 Image
            const imageBase64 = canvas.toDataURL('image/png');

            // Send to Backend
            fetch('/process-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ image: imageBase64 })
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    alert("Success! " + data.name);
                    window.location.href = "/dashboard"; 
                } else {
                    // SHOW REAL ERROR: Use the message sent from Python
                    let errorMsg = data.error || "Face not clear";
                    console.log("Failure reason:", errorMsg); // Check your browser console too!
                    
                    if(statusMessage) statusMessage.innerText = errorMsg + " Retrying...";
                    setTimeout(takeSnapshot, 2000);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if(statusMessage) statusMessage.innerText = "System Error. Retrying...";
                setTimeout(takeSnapshot, 3000);
            });
        }
    </script>
</body>
</html>