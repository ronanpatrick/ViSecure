import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export default function VisitorRegistration() {
    // --- STATE ---
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        FullName: '',
        Age: '',
        Sex: '',
        PurposeOfVisit: '',
        PersonToVisit: '',
    });
    
    const [photos, setPhotos] = useState([]); 
    const [isCapturing, setIsCapturing] = useState(false);
    const [model, setModel] = useState(null); 
    const [faceDetected, setFaceDetected] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const webcamRef = useRef(null); 
    const detectionInterval = useRef(null);

    // --- LOAD AI MODEL ---
    useEffect(() => {
        const loadModel = async () => {
            await tf.ready();
            const loadedModel = await blazeface.load();
            setModel(loadedModel);
            console.log("Blazeface Model Loaded");
        };
        loadModel();
    }, []);

    // --- HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = () => {
        if (!formData.FullName || !formData.Age || !formData.Sex || !formData.PurposeOfVisit) {
            setError("⚠️ Please fill in all required fields first.");
            return;
        }
        setError('');
        setStep(2);   
    };

    const handleBack = () => {
        setError('');
        setStep(1); 
        setFaceDetected(false);
        setPhotos([]);
    };

    // --- SLOWER BURST MODE (3 Seconds Total) ---
    const startBurstCapture = useCallback(() => {
        setIsCapturing(true);
        setPhotos([]); 
        
        let count = 0;
        const tempPhotos = [];

        // SLOWER INTERVAL: 600ms per photo
        const interval = setInterval(() => {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    tempPhotos.push(imageSrc);
                    count++;
                }
            }

            if (count >= 5) {
                clearInterval(interval);
                setPhotos(tempPhotos); 
                setIsCapturing(false);
            }
        }, 600); 
    }, [webcamRef]);

    // --- FACE SEARCH LOOP ---
    const startFaceDetection = useCallback(() => {
        if (detectionInterval.current) clearInterval(detectionInterval.current);

        detectionInterval.current = setInterval(async () => {
            if (
                typeof webcamRef.current !== "undefined" &&
                webcamRef.current !== null &&
                webcamRef.current.video.readyState === 4 &&
                model
            ) {
                const video = webcamRef.current.video;
                const predictions = await model.estimateFaces(video, false);

                if (predictions.length > 0) {
                    console.log("Face Detected!");
                    clearInterval(detectionInterval.current); 
                    setFaceDetected(true);
                    startBurstCapture(); 
                }
            }
        }, 500); 
    }, [model, startBurstCapture]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (photos.length < 5) {
            setError("⚠️ Please wait for the face scan to complete.");
            return;
        }

        try {
            const payload = { ...formData, photos: photos };
            const response = await axios.post('http://127.0.0.1:8000/api/register', payload);
            
            setMessage('✅ ' + response.data.message);
            setPhotos([]);
            setFormData({ FullName: '', Age: '', Sex: '', PurposeOfVisit: '', PersonToVisit: '' });
            setStep(1); 
            setFaceDetected(false);
            
        } catch (err) {
            console.error(err);
            setPhotos([]); 
            setError('❌ Registration failed. ' + (err.response?.data?.message || 'Check connection.'));
            setFaceDetected(false);
            setTimeout(() => startFaceDetection(), 2000);
        }
    };

    // --- STYLES ---
    const pageStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', backgroundColor: '#f0f2f5', padding: '20px' };
    const formContainerStyle = { width: '100%', maxWidth: '450px', padding: '30px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#333' };
    const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff', fontSize: '16px', boxSizing: 'border-box' };
    const buttonStyle = { width: '100%', padding: '12px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
    const backButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d', marginBottom: '10px' };

    // VERTICAL CAMERA STYLE
    const verticalVideoConstraints = {
        width: 480,
        height: 640,
        facingMode: "user" 
    };

    return (
        <div style={pageStyle}>
            <div style={formContainerStyle}>
                
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>
                    {step === 1 ? "Visitor Registration" : "Identity Verification"}
                </h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    Step {step} of 2
                </p>
                
                {message && <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '15px' }}>{message}</div>}
                {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    
                    {/* --- STEP 1: PERSONAL DETAILS --- */}
                    {step === 1 && (
                        <div>
                            <label><strong>Full Name:</strong></label>
                            <input type="text" name="FullName" value={formData.FullName} onChange={handleChange} required style={inputStyle} placeholder="Ex: Ronan" />

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label><strong>Age:</strong></label>
                                    <input type="number" name="Age" value={formData.Age} onChange={handleChange} required style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label><strong>Sex:</strong></label>
                                    <select name="Sex" value={formData.Sex} onChange={handleChange} required style={inputStyle}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            <label><strong>Purpose of Visit:</strong></label>
                            <input type="text" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={inputStyle} />
                            
                            <label><strong>Person to Visit:</strong></label>
                            <input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} />

                            <button type="button" onClick={handleNext} style={buttonStyle}>
                                Next: Face Verification 👉
                            </button>
                        </div>
                    )}

                    {/* --- STEP 2: VERTICAL FACE SCAN --- */}
                    {step === 2 && (
                        <div className="fade-in">
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                
                                {photos.length < 5 ? (
                                    <>
                                        {/* VERTICAL CAMERA CONTAINER */}
                                        <div style={{ 
                                            position: 'relative', 
                                            borderRadius: '15px',
                                            overflow: 'hidden', 
                                            marginBottom: '15px', 
                                            border: '4px solid #333',
                                            width: '100%',
                                            maxWidth: '300px', 
                                            aspectRatio: '3/4', 
                                            margin: '0 auto', 
                                            backgroundColor: '#000' 
                                        }}>
                                            
                                            <Webcam
                                                audio={false}
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                videoConstraints={verticalVideoConstraints}
                                                onUserMedia={startFaceDetection} 
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover' 
                                                }}
                                            />

                                            {/* AI STATUS OVERLAYS */}
                                            {!model && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                                                    ⚙️ Loading AI...
                                                </div>
                                            )}

                                            {model && !faceDetected && (
                                                <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center', color: 'white', textShadow: '0 1px 3px black', fontWeight: 'bold' }}>
                                                    👀 Looking for face...
                                                </div>
                                            )}

                                            {/* SCAN PROGRESS OVERLAY (No Numbers, Just Status) */}
                                            {isCapturing && (
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    border: '5px solid #00ff00',
                                                    backgroundColor: 'rgba(0, 255, 0, 0.1)'
                                                }}>
                                                    <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', textShadow: '0 2px 4px black',  animation: 'pulse 1s infinite' }}>
                                                        Scanning...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#555', fontWeight: 'bold' }}>
                                            {!model ? "Initializing..." : !faceDetected ? "Align your face in the frame." : "Please hold still."}
                                        </p>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e2e6ea', border: '1px solid #d6d8db', borderRadius: '8px', marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0, color: '#383d41' }}>📷 Scan Complete</h3>
                                        <p style={{ fontSize: '12px', color: '#555' }}>Biometrics captured successfully.</p>
                                        <button type="button" onClick={() => { 
                                            setPhotos([]); 
                                            setFaceDetected(false); 
                                            startFaceDetection(); 
                                        }} style={{ ...buttonStyle, backgroundColor: '#6c757d', fontSize: '12px', padding: '8px' }}>
                                            Scan Again
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button type="button" onClick={handleBack} style={{ ...backButtonStyle, flex: 1 }}>
                                        ⬅ Back
                                    </button>
                                    
                                    {photos.length >= 5 && (
                                        <button type="submit" style={{ ...buttonStyle, marginTop: 0, flex: 2 }}>
                                            Complete Registration ✅
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
            
            {/* Simple CSS Animation for the text */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}