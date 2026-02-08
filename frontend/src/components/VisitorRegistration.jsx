import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import VisitorPass from './VisitorPass';
import { resizeBase64 } from '../utils/imageResizer'; // 👈 IMPORT THE RESIZER

export default function VisitorRegistration() {
    // --- STATE ---
    const [step, setStep] = useState(0); 
    
    const [formData, setFormData] = useState({
        FullName: '',
        Age: '',
        Sex: '',
        PurposeOfVisit: '',
        PersonToVisit: '',
    });
    
    const [successData, setSuccessData] = useState(null);
    const [photos, setPhotos] = useState([]); 
    const [isCapturing, setIsCapturing] = useState(false);
    const [model, setModel] = useState(null); 
    const [faceDetected, setFaceDetected] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const webcamRef = useRef(null); 
    const detectionInterval = useRef(null);

    // --- LOAD AI ---
    useEffect(() => {
        const loadModel = async () => {
            await tf.ready();
            const loadedModel = await blazeface.load();
            setModel(loadedModel);
        };
        loadModel();
    }, []);

    // --- HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleModeSelect = (mode) => {
        setError('');
        setMessage('');
        setFormData({ FullName: '', Age: '', Sex: '', PurposeOfVisit: '', PersonToVisit: '' });
        setPhotos([]);
        setFaceDetected(false);
        
        if (mode === 'NEW') setStep(1); 
        if (mode === 'RETURNING') setStep(4); 
    };

    const handleBack = () => {
        setError('');
        setStep(0); 
        setFaceDetected(false);
        setPhotos([]);
    };

    const handleLoginCheck = async (photo) => {
        setMessage('Identifying...');
        try {
            // ⚡ RESIZE SINGLE PHOTO FOR LOGIN
            const compressedPhoto = await resizeBase64(photo);

            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/check-user`, { photo: compressedPhoto });
            const user = response.data.visitor;
            setFormData({
                FullName: user.FullName,
                Age: user.Age,
                Sex: user.Sex,
                PurposeOfVisit: '', 
                PersonToVisit: '',
            });
            setStep(5); 
            setMessage('');
        } catch (err) {
            console.error(err);
            const debugMsg = err.response?.data?.debug || 'Unknown Error';
            setError(`Login Failed: ${debugMsg}`); 
            setStep(0);
        }
    };

    // --- STABILIZED BURST CAPTURE ---
    const startBurstCapture = useCallback(() => {
        setIsCapturing(true);
        setPhotos([]); 
        
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
                setPhotos(tempPhotos); 
                setIsCapturing(false);
                
                // IF RETURNING VISITOR (Step 4):
                if (step === 4) handleLoginCheck(tempPhotos[4]);
            }
        }, 300); 
    }, [webcamRef, step]);

    // --- FACE SEARCH LOOP ---
    const startFaceDetection = useCallback(() => {
        if (detectionInterval.current) clearInterval(detectionInterval.current);
        detectionInterval.current = setInterval(async () => {
            if (webcamRef.current?.video?.readyState === 4 && model) {
                const predictions = await model.estimateFaces(webcamRef.current.video, false);
                if (predictions.length > 0) {
                    clearInterval(detectionInterval.current); 
                    setFaceDetected(true);
                    setTimeout(() => {
                        startBurstCapture();
                    }, 500);
                }
            }
        }, 500); 
    }, [model, startBurstCapture]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (step === 2 && photos.length < 5) {
            setError("Please wait for scan to complete.");
            return;
        }

        try {
            setMessage('Processing biometric data...'); // Feedback to user

            // ⚡ COMPRESS ALL PHOTOS BEFORE SENDING ⚡
            // This prevents "Payload Too Large" errors
            let processedPhotos = [];
            if (step === 2) {
                 processedPhotos = await Promise.all(photos.map(p => resizeBase64(p)));
            }

            const payload = { ...formData, photos: processedPhotos };
            
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register`, payload);
            
            console.log("Full Server Response:", response.data);

            const idToSave = response.data.log_id || response.data.visitor_id;
            if (idToSave) localStorage.setItem('active_visit_id', idToSave);

            setSuccessData({
                name: response.data.visitor_name,
                time: new Date().toLocaleString(),
                status: "AUTHORIZED",
                type: response.data.status,
                visitId: idToSave 
            });
            
            setStep(3); 
            
        } catch (err) {
            console.error(err);
            setPhotos([]); 
            const serverMsg = err.response?.data?.message || err.message;
            setError('Registration failed: ' + serverMsg);
            
            if (step === 2) {
                setFaceDetected(false);
                setTimeout(() => startFaceDetection(), 2000);
            }
        }
    };

    // --- MINIMALIST STYLES ---
    const colors = {
        primary: '#2c3e50',
        accent: '#34495e',
        success: '#27ae60',
        background: '#f8f9fa',
        card: '#ffffff',
        border: '#e9ecef',
        text: '#212529',
        subtext: '#6c757d'
    };

    const pageStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', backgroundColor: colors.background, fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" };
    const containerStyle = { width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: colors.card, boxShadow: '0 2px 15px rgba(0,0,0,0.05)', borderRadius: '0px', border: `1px solid ${colors.border}` };
    const headerStyle = { textAlign: 'center', marginBottom: '30px', color: colors.primary, fontSize: '24px', fontWeight: '600', letterSpacing: '-0.5px' };
    const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: colors.subtext, textTransform: 'uppercase', letterSpacing: '0.5px' };
    const inputStyle = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: `1px solid ${colors.border}`, backgroundColor: '#fff', fontSize: '15px', color: colors.text, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' };
    const buttonStyle = { width: '100%', padding: '14px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'background 0.2s' };
    const secondaryButtonStyle = { ...buttonStyle, backgroundColor: 'transparent', color: colors.subtext, border: `1px solid ${colors.border}` };
    const videoConstraints = { width: 480, height: 640, facingMode: "user" };

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                
                {step !== 3 && (
                    <h1 style={headerStyle}>ViSecure Access</h1>
                )}

                {message && <div style={{ padding: '12px', backgroundColor: '#e8f5e9', color: colors.success, fontSize: '14px', marginBottom: '20px', borderLeft: `4px solid ${colors.success}` }}>{message}</div>}
                {error && <div style={{ padding: '12px', backgroundColor: '#fbeaea', color: '#c0392b', fontSize: '14px', marginBottom: '20px', borderLeft: '4px solid #c0392b' }}>{error}</div>}

                {/* --- STEP 0: MODE SELECT --- */}
                {step === 0 && (
                    <div>
                        <button onClick={() => handleModeSelect('RETURNING')} style={buttonStyle}>Returning Visitor</button>
                        <button onClick={() => handleModeSelect('NEW')} style={{...secondaryButtonStyle, marginTop: '15px'}}>New Registration</button>
                    </div>
                )}

                {/* --- STEP 1: FORM --- */}
                {step === 1 && (
                    <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                         <div style={{ marginBottom: '20px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '10px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '500', color: colors.primary }}>Visitor Details</span>
                         </div>
                         <label style={labelStyle}>Full Name</label>
                         <input type="text" name="FullName" value={formData.FullName} onChange={handleChange} required style={inputStyle} />
                         <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Age</label>
                                <input type="number" name="Age" value={formData.Age} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Sex</label>
                                <select name="Sex" value={formData.Sex} onChange={handleChange} required style={{...inputStyle, height: '44px'}}>
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                         </div>
                         <label style={labelStyle}>Purpose of Visit</label>
                         <input type="text" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={inputStyle} />
                         <label style={labelStyle}>Host / Department</label>
                         <input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} />
                         <button type="submit" style={buttonStyle}>Continue</button>
                         <button type="button" onClick={handleBack} style={secondaryButtonStyle}>Back</button>
                    </form>
                )}

                {/* --- STEP 2 & 4: CAMERA --- */}
                {(step === 2 || step === 4) && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <span style={{ fontSize: '16px', fontWeight: '500', color: colors.primary }}>
                                {step === 2 ? "Face Registration" : "Identity Verification"}
                            </span>
                        </div>

                        {(photos.length < 5) ? (
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', backgroundColor: '#000', overflow: 'hidden' }}>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={videoConstraints}
                                    onUserMedia={startFaceDetection} 
                                    mirrored={true}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                                />
                                <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px', border: `1px solid rgba(255,255,255,0.3)` }}></div>
                                <div style={{ position: 'absolute', bottom: '40px', width: '100%', textAlign: 'center' }}>
                                    <span style={{ color: 'white', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '2px' }}>
                                        {!faceDetected ? "Align Face in Frame" : "Processing..."}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                                <h3 style={{ margin: '0 0 10px 0', color: colors.primary }}>Scan Complete</h3>
                                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0 }}>Biometric data captured.</p>
                            </div>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button onClick={handleBack} style={secondaryButtonStyle}>Cancel</button>
                            {step === 2 && photos.length >= 5 && (
                                <button onClick={handleSubmit} style={buttonStyle}>Submit Registration</button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- STEP 5: UPDATE DETAILS --- */}
                {step === 5 && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', color: colors.primary }}>Welcome Back</h2>
                            <p style={{ fontSize: '14px', color: colors.subtext, margin: 0 }}>{formData.FullName}</p>
                        </div>
                        <label style={labelStyle}>New Purpose of Visit</label>
                        <input type="text" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={inputStyle} autoFocus />
                        <label style={labelStyle}>Host / Department</label>
                        <input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} />
                        <button type="submit" style={buttonStyle}>Confirm Entry</button>
                    </form>
                )}

                {/* --- STEP 3: DIGITAL PASS --- */}
                {step === 3 && successData && (
                    <VisitorPass 
                        visitor={{ FullName: successData.name, AffiliationType: 'Visitor' }} 
                        visitId={successData.visitId} 
                        onClose={() => window.location.reload()} 
                    />
                )}
            </div>
        </div>
    );
}