import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VisitorPass from './VisitorPass';
import FaceScanner from './FaceScanner'; 
import { resizeBase64 } from '../utils/imageResizer';

export default function VisitorRegistration() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const step = parseInt(searchParams.get('step') || '0', 10);

    const setStep = (newStep, replaceHistory = false) => {
        setSearchParams({ step: newStep.toString() }, { replace: replaceHistory });
    };

    const [formData, setFormData] = useState({
        FirstName: '', MiddleName: '', Surname: '', Age: '', Sex: '', 
        VisitorType: 'Visitor', PurposeOfVisit: '', DepartmentToVisit: '', 
        PersonToVisit: '', ContactNumber: '', Email: ''
    });
    
    const [customDepartment, setCustomDepartment] = useState(''); 
    const [customVisitorType, setCustomVisitorType] = useState('');
    const [successData, setSuccessData] = useState(null);
    const [photos, setPhotos] = useState([]); 
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const activeId = localStorage.getItem('active_visit_id');
        const activeVisitorId = localStorage.getItem('active_visitor_id'); // 🆕 Fetch ID
        const activeName = localStorage.getItem('visitor_name');
        const activeType = localStorage.getItem('visitor_type');

        if (activeId && activeName && activeVisitorId) {
            setSuccessData({
                name: activeName, time: new Date().toLocaleString(),
                status: "AUTHORIZED", type: activeType, visitId: activeId,
                visitorId: activeVisitorId // 🆕 Pass ID into success state
            });
            
            if (step !== 3) setStep(3, true); 
        } else if (step === 3) {
            setStep(0, true);
        }
    }, [step]); 

    const departments = ["Registrar", "Accounting", "Dean's Office", "Clinic", "Guidance Office", "Library", "Laboratory", "Faculty Room", "HR Office", "Principal's Office", "Others"];
    const visitorTypes = ["Visitor", "Contractor", "Parent/Guardian", "Alumni", "Delivery", "Applicant", "Guest Speaker"];

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleModeSelect = (mode) => {
        setError(''); setMessage('');
        setFormData({ FirstName: '', MiddleName: '', Surname: '', Age: '', Sex: '', VisitorType: 'Visitor', PurposeOfVisit: '', PersonToVisit: '', DepartmentToVisit: '', ContactNumber: '', Email: '' });
        setCustomDepartment(''); setPhotos([]);
        if (mode === 'NEW') setStep(1); 
        if (mode === 'RETURNING') setStep(4); 
    };

    const handleBack = () => { setError(''); navigate(-1); };

    const handleScanComplete = (capturedPhotos) => {
        setPhotos(capturedPhotos);
        if (step === 4) handleLoginCheck(capturedPhotos[4]);
    };

    const handleLoginCheck = async (photo) => {
        setMessage('Identifying...');
        try {
            const compressedPhoto = await resizeBase64(photo);
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/check-user`, { photo: compressedPhoto });
            const user = response.data.visitor;
            
            setFormData({
                FirstName: user.FirstName, MiddleName: user.MiddleName || '', Surname: user.Surname, 
                Age: user.Age, Sex: user.Sex, VisitorType: user.VisitorType || 'Visitor', 
                ContactNumber: user.ContactNumber || '', Email: user.Email || '', 
                PurposeOfVisit: '', PersonToVisit: '', DepartmentToVisit: '',
            });
            setStep(5); 
            setMessage('');
        } catch (err) {
            console.error(err);
            setError(`Login Failed: ${err.response?.data?.debug || 'Unknown Error'}`); 
            setStep(0); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');

        const finalDepartment = formData.DepartmentToVisit === 'Others' ? customDepartment : formData.DepartmentToVisit;
        const finalVisitorType = formData.VisitorType === 'Others' ? customVisitorType : formData.VisitorType; 
        if (formData.DepartmentToVisit === 'Others' && !customDepartment.trim()) {
            setError("Please specify the department."); return;
        }

        try {
            setMessage('Processing biometric data...'); 
            let processedPhotos = [];
            if (step === 2) processedPhotos = await Promise.all(photos.map(p => resizeBase64(p)));

            const payload = { 
                ...formData, DepartmentToVisit: finalDepartment, VisitorType: finalVisitorType, photos: processedPhotos 
            };
            
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register`, payload);
            
            // 🔑 Retrieve both Log ID and Visitor ID
            const logIdToSave = response.data.log_id || response.data.id;
            const visitorIdToSave = response.data.visitor_id; 

            if (logIdToSave && visitorIdToSave) {
                localStorage.setItem('active_visit_id', logIdToSave);
                localStorage.setItem('active_visitor_id', visitorIdToSave); // 🆕 Save ID
                localStorage.setItem('visitor_name', response.data.visitor_name);
                localStorage.setItem('visitor_type', formData.VisitorType);
            }

            setSuccessData({
                name: response.data.visitor_name, time: new Date().toLocaleString(),
                status: "AUTHORIZED", type: response.data.status, visitId: logIdToSave,
                visitorId: visitorIdToSave // 🆕 Pass to success state
            });
            
            setStep(3, true); 
            
        } catch (err) {
            console.error(err);
            setPhotos([]); 
            setError('Registration failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const colors = { primary: '#0f172a', accent: '#3b82f6', success: '#10b981', background: '#f8fafc', card: '#ffffff', border: '#e2e8f0', text: '#334155', subtext: '#64748b' };
    const pageStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', backgroundColor: colors.background, fontFamily: "'Inter', sans-serif", padding: '20px', boxSizing: 'border-box' };
    const containerStyle = { width: '100%', maxWidth: '550px', padding: '35px', backgroundColor: colors.card, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', borderRadius: '16px', border: `1px solid ${colors.border}` };
    const headerStyle = { textAlign: 'center', marginBottom: '30px', color: colors.primary, fontSize: '26px', fontWeight: '700' };
    const sectionTitleStyle = { fontSize: '16px', fontWeight: '600', color: colors.primary, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' };
    const labelContainerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' };
    const labelStyle = { fontSize: '13px', fontWeight: '600', color: colors.text };
    const optionalStyle = { fontSize: '12px', fontWeight: '500', color: '#94a3b8' };
    const inputStyle = { width: '100%', padding: '12px 14px', marginBottom: '18px', borderRadius: '8px', border: `1.5px solid ${colors.border}`, backgroundColor: '#f8fafc', fontSize: '15px', color: colors.primary, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' };
    const nameInputStyle = { ...inputStyle, textTransform: 'capitalize' };
    const textAreaStyle = { ...inputStyle, minHeight: '80px', resize: 'vertical' };
    const buttonStyle = { width: '100%', padding: '14px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: 'background 0.2s' };
    const secondaryButtonStyle = { ...buttonStyle, backgroundColor: 'white', color: colors.text, border: `1.5px solid ${colors.border}` };
    const grid2Col = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 15px' };
    const grid3Col = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0 15px' };

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                
                {step !== 3 && <h1 style={headerStyle}>ViSecure Access</h1>}

                {message && <div style={{ padding: '12px', backgroundColor: '#e8f5e9', color: colors.success, fontSize: '14px', marginBottom: '20px', borderLeft: `4px solid ${colors.success}` }}>{message}</div>}
                {error && <div style={{ padding: '12px', backgroundColor: '#fbeaea', color: '#c0392b', fontSize: '14px', marginBottom: '20px', borderLeft: '4px solid #c0392b' }}>{error}</div>}

                {step === 0 && (
                    <div className="fade-in">
                        <button onClick={() => handleModeSelect('RETURNING')} style={buttonStyle}>Returning Visitor</button>
                        <button onClick={() => handleModeSelect('NEW')} style={{...secondaryButtonStyle, marginTop: '15px'}}>New Registration</button>
                    </div>
                )}

                {step === 1 && (
                    <form className="fade-in" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                        <div style={{ marginBottom: '25px' }}>
                            <div style={sectionTitleStyle}><span style={{color: colors.accent}}>1.</span> Personal Information</div>
                            <div style={grid3Col}>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>First Name</label></div><input type="text" name="FirstName" value={formData.FirstName} onChange={handleChange} required style={nameInputStyle} placeholder="Juan" /></div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Middle Name</label></div><input type="text" name="MiddleName" value={formData.MiddleName} onChange={handleChange} required style={nameInputStyle} placeholder="G." /></div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Last Name</label></div><input type="text" name="Surname" value={formData.Surname} onChange={handleChange} required style={nameInputStyle} placeholder="Dela Cruz" /></div>
                            </div>
                            <div style={grid3Col}>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Age</label></div><input type="number" name="Age" value={formData.Age} onChange={handleChange} required style={inputStyle} placeholder="21" /></div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Sex</label></div><select name="Sex" value={formData.Sex} onChange={handleChange} required style={{...inputStyle, padding: '11px 14px'}}><option value="" disabled>Select...</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Visitor Type</label></div><select name="VisitorType" value={formData.VisitorType} onChange={handleChange} style={{...inputStyle, padding: '11px 14px'}}>{visitorTypes.map(t => <option key={t} value={t}>{t}</option>)}<option value="Others">Others</option></select>
                                {formData.VisitorType === 'Others' && <input type="text" value={customVisitorType} onChange={(e) => setCustomVisitorType(e.target.value)} placeholder="Please specify..." style={{...inputStyle, marginTop:'-10px', borderColor: colors.accent}} required />}
                                </div>
                            </div>
                            <div style={grid2Col}>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Contact No.</label> <span style={optionalStyle}>(Optional)</span></div><input type="tel" name="ContactNumber" value={formData.ContactNumber} onChange={handleChange} style={inputStyle} placeholder="09XX XXX XXXX" /></div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Email Address</label> <span style={optionalStyle}>(Optional)</span></div><input type="email" name="Email" value={formData.Email} onChange={handleChange} style={inputStyle} placeholder="juan@example.com" /></div>
                            </div>
                        </div>

                        <hr style={{border:'0', borderTop:`1px solid ${colors.border}`, margin:'0 0 25px 0'}}/>

                        <div style={{ marginBottom: '10px' }}>
                            <div style={sectionTitleStyle}><span style={{color: colors.accent}}>2.</span> Visit Details</div>
                            <div style={grid2Col}>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Department</label></div><select name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required style={{...inputStyle, padding: '11px 14px'}}><option value="" disabled>Select...</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                {formData.DepartmentToVisit === 'Others' && <input type="text" value={customDepartment} onChange={(e) => setCustomDepartment(e.target.value)} placeholder="Please specify..." style={{...inputStyle, marginTop:'-10px', borderColor: colors.accent}} required />}
                                </div>
                                <div><div style={labelContainerStyle}><label style={labelStyle}>Person to Visit</label> <span style={optionalStyle}>(Optional)</span></div><input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} placeholder="Name..." /></div>
                            </div>
                            <div style={labelContainerStyle}><label style={labelStyle}>Purpose of Visit</label></div>
                            <textarea name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={textAreaStyle} placeholder="Reason..." />
                        </div>

                        <button type="submit" style={buttonStyle}>Proceed to Face Scan</button>
                        <button type="button" onClick={handleBack} style={secondaryButtonStyle}>Back to Start</button>
                    </form>
                )}

                {(step === 2 || step === 4) && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}><span style={{ fontSize: '16px', fontWeight: '500', color: colors.primary }}>{step === 2 ? "Face Registration" : "Identity Verification"}</span></div>
                        {photos.length < 5 ? (
                            <FaceScanner onScanComplete={handleScanComplete} onCancel={handleBack} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                                <h3 style={{ margin: '0 0 10px 0', color: colors.primary }}>Scan Complete</h3>
                                <p style={{ fontSize: '14px', color: colors.subtext, margin: 0 }}>Biometric data captured.</p>
                                {step === 2 && (
                                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button onClick={() => setPhotos([])} style={secondaryButtonStyle}>Retake</button>
                                        <button onClick={handleSubmit} style={buttonStyle}>Submit</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <form className="fade-in" onSubmit={handleSubmit}>
                        <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <h2 style={{ fontSize: '20px', margin: '0 0 5px 0', color: colors.primary }}>Identity Verified</h2>
                            <p style={{ fontSize: '14px', color: colors.text, margin: 0, fontWeight: '500' }}>Welcome back, {formData.FirstName} {formData.Surname}</p>
                        </div>
                        <div style={sectionTitleStyle}><span style={{color: colors.accent}}>•</span> New Visit Details</div>
                        <div style={grid2Col}>
                            <div><div style={labelContainerStyle}><label style={labelStyle}>Department</label></div><select name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required style={{...inputStyle, padding: '11px 14px'}}><option value="" disabled>Select...</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            {formData.DepartmentToVisit === 'Others' && <input type="text" value={customDepartment} onChange={(e) => setCustomDepartment(e.target.value)} placeholder="Please specify..." style={{...inputStyle, marginTop:'-10px', borderColor: colors.accent}} required />}</div>
                            <div><div style={labelContainerStyle}><label style={labelStyle}>Person to Visit</label></div><input type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} style={inputStyle} placeholder="Name..." /></div>
                        </div>
                        <div style={labelContainerStyle}><label style={labelStyle}>Purpose of Visit</label></div><textarea name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required style={textAreaStyle} placeholder="Reason..." autoFocus />
                        <button type="submit" style={buttonStyle}>Confirm Entry</button>
                        <button type="button" onClick={handleBack} style={secondaryButtonStyle}>Cancel</button>
                    </form>
                )}

                {step === 3 && successData && (
                    <VisitorPass 
                        visitor={{ 
                            FullName: successData.name, 
                            AffiliationType: formData.VisitorType,
                            VisitorID: successData.visitorId // 🔑 Critical for the QR
                        }} 
                        visitId={successData.visitId} 
                        onClose={() => window.location.reload()} 
                    />
                )}
            </div>
        </div>
    );
}