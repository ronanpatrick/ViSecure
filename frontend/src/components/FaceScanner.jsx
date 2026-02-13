import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export default function FaceScanner({ onScanComplete, onCancel }) {
    const webcamRef = useRef(null);
    const detectionInterval = useRef(null);
    const [model, setModel] = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    // 1. Load AI Model
    useEffect(() => {
        const loadModel = async () => {
            try {
                await tf.ready();
                const loadedModel = await blazeface.load();
                setModel(loadedModel);
            } catch (err) {
                console.error("AI Load Error:", err);
            }
        };
        loadModel();
    }, []);

    // 2. Burst Capture Logic
    const startBurstCapture = useCallback(() => {
        setIsCapturing(true);
        let count = 0;
        const tempPhotos = [];
        const limit = 5;

        const interval = setInterval(() => {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    tempPhotos.push(imageSrc);
                    count++;
                }
            }

            if (count >= limit) {
                clearInterval(interval);
                setIsCapturing(false);
                // Pass the photos back to the parent
                onScanComplete(tempPhotos);
            }
        }, 300);
    }, [onScanComplete]);

    // 3. Face Detection Loop
    const startFaceDetection = useCallback(() => {
        if (detectionInterval.current) clearInterval(detectionInterval.current);
        
        detectionInterval.current = setInterval(async () => {
            if (
                webcamRef.current &&
                webcamRef.current.video &&
                webcamRef.current.video.readyState === 4 &&
                model &&
                !isCapturing
            ) {
                try {
                    const predictions = await model.estimateFaces(webcamRef.current.video, false);
                    if (predictions.length > 0) {
                        clearInterval(detectionInterval.current);
                        setFaceDetected(true);
                        // Small delay to stabilize before snapping
                        setTimeout(() => startBurstCapture(), 500);
                    }
                } catch (err) {
                    console.warn("Detection Oversight:", err);
                }
            }
        }, 500);
    }, [model, isCapturing, startBurstCapture]);

    // Auto-start detection when model is ready
    useEffect(() => {
        if (model) startFaceDetection();
        return () => {
            if (detectionInterval.current) clearInterval(detectionInterval.current);
        };
    }, [model, startFaceDetection]);

    // --- STYLES ---
    const videoConstraints = { width: 480, height: 640, facingMode: "user" };

    return (
        <div className="fade-in">
            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', backgroundColor: '#000', overflow: 'hidden' }}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    mirrored={true}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                />
                
                {/* Face Frame Overlay */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px', border: `1px solid rgba(255,255,255,0.3)` }}></div>

                {/* Status Label */}
                <div style={{ position: 'absolute', bottom: '40px', width: '100%', textAlign: 'center' }}>
                    <span style={{ color: 'white', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '2px' }}>
                        {!model ? "Initializing AI..." : (!faceDetected ? "Align Face in Frame" : "Processing...")}
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', color: '#666', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}