import { useState } from 'react';
import axios from 'axios';
import VisitorPass from './VisitorPass';
import FaceScanner from './FaceScanner'; 
import { resizeBase64 } from '../utils/imageResizer';

export default function VisitorRegistration() {
    // --- STATE ---
    const [step, setStep] = useState(0); 
    const [formData, setFormData] = useState({
        FirstName: '',
        MiddleName: '',
        Surname: '',
        Age: '',
        Sex: '',
        VisitorType: 'Visitor', // Default
        PurposeOfVisit: '',
        DepartmentToVisit: '',
        PersonToVisit: '',
        ContactNumber: '',
        Email: ''
    });
    
    const [customDepartment, setCustomDepartment] = useState(''); // Handle "Others" input
    const [successData, setSuccessData] = useState(null);
    const [photos, setPhotos] = useState([]); 
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // --- LISTS ---
    const departments = [
        "Registrar", "Accounting", "Dean's Office", "Clinic", 
        "Guidance Office", "Library", "Laboratory", "Faculty Room", 
        "HR Office", "Principal's Office", "Others"
    ];

    const visitorTypes = [
        "Visitor", "Contractor", "Parent/Guardian", "Alumni", "Delivery", "Applicant", "Guest Speaker"
    ];

    // --- HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleModeSelect = (mode) => {
        setError('');
        setMessage('');
        setFormData({ 
            FirstName: '', MiddleName: '', Surname: '', Age: '', Sex: '', 
            VisitorType: 'Visitor', PurposeOfVisit: '', PersonToVisit: '', 
            DepartmentToVisit: '', ContactNumber: '', Email: '' 
        });
        setCustomDepartment('');
        setPhotos([]);
        
        if (mode === 'NEW') setStep(1); 
        if (mode === 'RETURNING') setStep(4); 
    };

    const handleBack = () => {
        setError('');
        setStep(0); 
        setPhotos([]);
    };

    // Called when FaceScanner finishes taking 5 photos
    const handleScanComplete = (capturedPhotos) => {
        setPhotos(capturedPhotos);
        
        // If we are in "Returning/Login" mode, verify immediately
        if (step === 4) {
            handleLoginCheck(capturedPhotos[4]);
        }
    };

    const handleLoginCheck = async (photo) => {
        setMessage('Identifying...');
        try {
            const compressedPhoto = await resizeBase64(photo);
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/check-user`, { photo: compressedPhoto });
            const user = response.data.visitor;
            
            setFormData({
                FirstName: user.FirstName,
                MiddleName: user.MiddleName || '',
                Surname: user.Surname,
                Age: user.Age,
                Sex: user.Sex,
                VisitorType: user.VisitorType || 'Visitor',
                ContactNumber: user.ContactNumber || '',
                Email: user.Email || '',
                PurposeOfVisit: '', 
                PersonToVisit: '',
                DepartmentToVisit: '',
            });
            setStep(5); 
            setMessage('');
        } catch (err) {
            console.error(err);
            const debugMsg = err.response?.data?.debug || 'Unknown Error';
            setError(`Login Failed: ${debugMsg}`); 
            setStep(0); // Go back to start on fail
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Logic: If department is "Others", use the custom input
        const finalDepartment = formData.DepartmentToVisit === 'Others' ? customDepartment : formData.DepartmentToVisit;

        if (formData.DepartmentToVisit === 'Others' && !customDepartment.trim()) {
            setError("Please specify the department.");
            return;
        }

        try {
            setMessage('Processing biometric data...'); 

            let processedPhotos = [];
            // Resize photos only if registering new user
            if (step === 2) {
                 processedPhotos = await Promise.all(photos.map(p => resizeBase64(p)));
            }

            const payload = { 
                ...formData, 
                DepartmentToVisit: finalDepartment,
                photos: processedPhotos 
            };

            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register`, payload);
            
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
            setPhotos([]); // Clear photos so they can retry
            const serverMsg = err.response?.data?.message || err.message;
            setError('Registration failed: ' + serverMsg);
        }
    };

    // --- STYLES ---
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
    const containerStyle = { width: '100%', maxWidth: '600px', padding: '40px', backgroundColor: colors.card, boxShadow: '0 2px 15px rgba(0,0,0,0.05)', borderRadius: '8px', border: `1px solid ${colors.border}` };
    const headerStyle = { textAlign: 'center', marginBottom: '30px', color: colors.primary, fontSize: '24px', fontWeight: '600', letterSpacing: '-0.5px' };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: colors.subtext, textTransform: 'uppercase', letterSpacing: '0.5px' };
    const inputStyle = { width: '100%', padding: '10px 12px', marginBottom: '15px', borderRadius: '4px', border: `1px solid ${colors.border}`, backgroundColor: '#fff', fontSize: '14px', color: colors.text, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' };
    const buttonStyle = { width: '100%', padding: '14px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'background 0.2s' };
    const secondaryButtonStyle = { ...buttonStyle, backgroundColor: 'transparent', color: colors.subtext, border: `1px solid ${colors.border}` };
    const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };

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
                         
                         <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>First Name</label>
                                <input type="text" name="FirstName" value={formData.FirstName} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mid Name</label>
                                <input type="text" name="MiddleName" value={formData.MiddleName} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name</label>
                                <input type="text" name="Surname" value={formData.Surname} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>

                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Age</label>
                                <input type="number" name="Age" value={formData.Age} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Sex</label>
                                <select name="Sex" value={formData.Sex} onChange={handleChange} required style={{...inputStyle, height: '42px'}}>
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Type</label>
                                <select name="VisitorType" value={formData.VisitorType} onChange={handleChange} style={{...inputStyle, height: '42px'}}>
                                    {visitorTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                         </div>

                         <div style={rowStyle}>
                            <div>
                                <label style={labelStyle}>Contact No.</label>
                                <input type="text" name="ContactNumber" value={formData.ContactNumber} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input type="email" name="Email" value={formData.Email} onChange={handleChange} style={inputStyle} />
                            </div>
                         </div>

                         <hr style={{border:'0', borderTop:`1px solid ${colors.border}`, margin:'10px 0 20px 0'}}/>

                         <label style={labelStyle}>Purpose of Visit</label>
                         <input type="text" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={inputStyle} />
                         
                         <div style={rowStyle}>
                             <div>
                                 <label style={labelStyle}>Person to Visit</label>
                                 <input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} />
                             </div>
                             <div>
                                 <label style={labelStyle}>Department</label>
                                 <select name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required style={{...inputStyle, height: '42px'}}>
                                     <option value="">Select...</option>
                                     {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                 </select>
                                 {formData.DepartmentToVisit === 'Others' && (
                                    <input 
                                        type="text" 
                                        value={customDepartment}
                                        onChange={(e) => setCustomDepartment(e.target.value)}
                                        placeholder="Specify Dept..."
                                        style={{...inputStyle, marginTop:'-10px', backgroundColor: '#f0f9ff', borderColor: '#3b82f6'}}
                                        required
                                    />
                                 )}
                             </div>
                         </div>

                         <button type="submit" style={buttonStyle}>Continue</button>
                         <button type="button" onClick={handleBack} style={secondaryButtonStyle}>Back</button>
                    </form>
                )}

                {/* --- STEP 2 & 4: CAMERA (REFACTORED) --- */}
                {(step === 2 || step === 4) && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <span style={{ fontSize: '16px', fontWeight: '500', color: colors.primary }}>
                                {step === 2 ? "Face Registration" : "Identity Verification"}
                            </span>
                        </div>

                        {/* SHOW SCANNER IF PHOTOS NOT TAKEN YET */}
                        {photos.length < 5 ? (
                            <FaceScanner 
                                onScanComplete={handleScanComplete} 
                                onCancel={handleBack} 
                            />
                        ) : (
                            // SHOW COMPLETE MESSAGE ONCE DONE
                            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                                <h3 style={{ margin: '0 0 10px 0', color: colors.primary }}>Scan Complete</h3>
                                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0 }}>Biometric data captured.</p>
                                
                                {step === 2 && (
                                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button onClick={() => setPhotos([])} style={secondaryButtonStyle}>Retake</button>
                                        <button onClick={handleSubmit} style={buttonStyle}>Submit Registration</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 5: UPDATE DETAILS (Returning User) --- */}
                {step === 5 && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', color: colors.primary }}>Welcome Back</h2>
                            <p style={{ fontSize: '14px', color: colors.subtext, margin: 0 }}>
                                {formData.FirstName} {formData.Surname} ({formData.VisitorType})
                            </p>
                        </div>
                        <label style={labelStyle}>New Purpose of Visit</label>
                        <input type="text" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={inputStyle} autoFocus />
                        
                        <div style={rowStyle}>
                             <div>
                                 <label style={labelStyle}>Person to Visit</label>
                                 <input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} />
                             </div>
                             <div>
                                 <label style={labelStyle}>Department</label>
                                 <select name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required style={{...inputStyle, height: '42px'}}>
                                     <option value="">Select...</option>
                                     {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                 </select>
                                 {formData.DepartmentToVisit === 'Others' && (
                                    <input 
                                        type="text" 
                                        value={customDepartment}
                                        onChange={(e) => setCustomDepartment(e.target.value)}
                                        placeholder="Specify Dept..."
                                        style={{...inputStyle, marginTop:'-10px', backgroundColor: '#f0f9ff', borderColor: '#3b82f6'}}
                                        required
                                    />
                                 )}
                             </div>
                         </div>

                        <button type="submit" style={buttonStyle}>Confirm Entry</button>
                    </form>
                )}

                {/* --- STEP 3: DIGITAL PASS --- */}
                {step === 3 && successData && (
                    <VisitorPass 
                        visitor={{ 
                            FullName: successData.name, 
                            AffiliationType: formData.VisitorType 
                        }} 
                        visitId={successData.visitId} 
                        onClose={() => window.location.reload()} 
                    />
                )}
            </div>
        </div>
    );
}