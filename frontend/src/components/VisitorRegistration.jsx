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
    const [mounted, setMounted] = useState(false);
    
    // NEW: Added state to toggle the scanner during Step 2
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        setMounted(true);
        const activeId = localStorage.getItem('active_visit_id');
        const activeVisitorId = localStorage.getItem('active_visitor_id');
        const activeName = localStorage.getItem('visitor_name');
        const activeType = localStorage.getItem('visitor_type');

        if (activeId && activeName && activeVisitorId) {
            setSuccessData({
                name: activeName, time: new Date().toLocaleString(),
                status: "AUTHORIZED", type: activeType, visitId: activeId,
                visitorId: activeVisitorId
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
        setShowScanner(false); // Ensure scanner is hidden when restarting
        if (mode === 'NEW') setStep(1);
        if (mode === 'RETURNING') setStep(4);
    };

    const handleBack = () => { setError(''); navigate(-1); };

    const handleScanComplete = (capturedPhotos) => {
        setPhotos(capturedPhotos);
        setShowScanner(false); // Hide the scanner once photos are taken
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
            const logIdToSave = response.data.log_id || response.data.id;
            const visitorIdToSave = response.data.visitor_id;

            if (logIdToSave && visitorIdToSave) {
                localStorage.setItem('active_visit_id', logIdToSave);
                localStorage.setItem('active_visitor_id', visitorIdToSave);
                localStorage.setItem('visitor_name', response.data.visitor_name);
                localStorage.setItem('visitor_type', formData.VisitorType);
            }

            setSuccessData({
                name: response.data.visitor_name, time: new Date().toLocaleString(),
                status: "AUTHORIZED", type: response.data.status, visitId: logIdToSave,
                visitorId: visitorIdToSave
            });

            setStep(3, true);
        } catch (err) {
            console.error(err);
            setPhotos([]);
            setError('Registration failed: ' + (err.response?.data?.message || err.message));
        }
    };

    // ─── Wizard step labels ──────────────────────────────────────────────────
    const wizardSteps = ['Identity', 'Visit', 'Verify'];
    const wizardIndex = step === 1 ? 0 : (step === 2 || step === 5) ? 1 : step === 4 ? 2 : -1;

    const showWizard = [1, 2, 5].includes(step);
    const showHeader = step !== 3;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                body { background: #f1f5f9; }

                .vr-root {
                    min-height: 100vh; width: 100%; background: #f1f5f9; font-family: 'DM Sans', sans-serif;
                    display: flex; flex-direction: column; align-items: center;
                }

                /* ── TOP BAR ─────────────────────────── */
                .vr-topbar {
                    width: 100%; background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 14px 20px;
                    display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 50;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
                }
                .vr-topbar-shield { flex-shrink: 0; filter: drop-shadow(0 2px 6px rgba(37,99,235,0.3)); }
                .vr-topbar-brand { font-size: 17px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; }
                .vr-topbar-brand span { color: #2563eb; }
                .vr-topbar-tag { margin-left: auto; font-family: 'DM Mono', monospace; font-size: 9.5px; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; white-space: nowrap; }

                /* ── MAIN CONTENT ────────────────────── */
                .vr-body { width: 100%; max-width: 520px; padding: 24px 16px 48px; flex: 1; opacity: 0; transform: translateY(12px); transition: opacity 0.4s ease, transform 0.4s ease; }
                .vr-body.vr-in { opacity: 1; transform: translateY(0); }

                /* ── STEP WIZARD ─────────────────────── */
                .vr-wizard { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 28px; padding: 0 4px; }
                .vr-wstep { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; flex: 1; }
                .vr-wstep-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; transition: all 0.3s ease; position: relative; z-index: 2; border: 2px solid #e2e8f0; background: #fff; color: #94a3b8; }
                .vr-wstep.active .vr-wstep-circle { background: #2563eb; border-color: #2563eb; color: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }
                .vr-wstep.done .vr-wstep-circle { background: #10b981; border-color: #10b981; color: #fff; }
                .vr-wstep-label { font-size: 10.5px; font-weight: 600; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase; transition: color 0.3s; }
                .vr-wstep.active .vr-wstep-label { color: #2563eb; }
                .vr-wstep.done .vr-wstep-label { color: #10b981; }
                .vr-wconnector { flex: 1; height: 2px; background: #e2e8f0; margin-bottom: 18px; transition: background 0.3s; position: relative; top: -9px; }
                .vr-wconnector.done { background: #10b981; }

                /* ── CARD ────────────────────────────── */
                .vr-card { background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; margin-bottom: 16px; }
                .vr-card-header { padding: 20px 22px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 10px; }
                .vr-card-header-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .vr-card-header-title { font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px; }
                .vr-card-header-sub { font-size: 12px; color: #94a3b8; font-weight: 400; margin-top: 1px; }
                .vr-card-body { padding: 20px 22px; }

                /* ── FIELDS ──────────────────────────── */
                .vr-field { margin-bottom: 14px; }
                .vr-field:last-child { margin-bottom: 0; }
                .vr-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .vr-label-text { font-size: 12px; font-weight: 600; color: #374151; letter-spacing: 0.03em; text-transform: uppercase; }
                .vr-label-opt { font-size: 11px; color: #94a3b8; font-weight: 400; text-transform: none; letter-spacing: 0; font-family: 'DM Mono', monospace; }
                .vr-input, .vr-select, .vr-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 15px; color: #0f172a; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; }
                .vr-input::placeholder, .vr-textarea::placeholder { color: #cbd5e1; }
                .vr-input:focus, .vr-select:focus, .vr-textarea:focus { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
                .vr-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 38px; cursor: pointer; }
                .vr-textarea { min-height: 90px; resize: vertical; line-height: 1.55; }
                .vr-input.capitalize { text-transform: capitalize; }
                .vr-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .vr-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
                @media (max-width: 360px) { .vr-row3 { grid-template-columns: 1fr 1fr; } }

                /* ── MODE SELECT (Step 0) ─────────────── */
                .vr-mode-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 18px; padding: 26px 22px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; margin-bottom: 12px; width: 100%; text-align: left; }
                .vr-mode-card:hover { border-color: #2563eb; box-shadow: 0 4px 20px rgba(37,99,235,0.12); transform: translateY(-1px); }
                .vr-mode-card.primary { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); border-color: transparent; }
                .vr-mode-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
                .vr-mode-title { font-size: 17px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px; }
                .vr-mode-card.primary .vr-mode-title { color: #fff; }
                .vr-mode-sub { font-size: 13px; color: #64748b; line-height: 1.4; font-weight: 400; }
                .vr-mode-card.primary .vr-mode-sub { color: rgba(255,255,255,0.75); }
                .vr-mode-arrow { align-self: flex-end; margin-top: 4px; }

                /* ── BUTTONS ──────────────────────────── */
                .vr-btn { width: 100%; padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: 0.01em; }
                .vr-btn-primary { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,0.3); }
                .vr-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }
                .vr-btn-primary:active { transform: translateY(0); }
                .vr-btn-secondary { background: #fff; color: #475569; border: 1.5px solid #e2e8f0; }
                .vr-btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
                .vr-btn-glow { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #4f46e5 100%); color: #fff; box-shadow: 0 0 0 0 rgba(37,99,235,0.5); animation: vr-glow-pulse 2s ease-in-out infinite; font-size: 16px; padding: 17px; }
                @keyframes vr-glow-pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(37,99,235,0.35), 0 0 0 0 rgba(37,99,235,0.25); } 50% { box-shadow: 0 6px 28px rgba(37,99,235,0.5), 0 0 0 8px rgba(37,99,235,0); } }
                .vr-nav { display: flex; gap: 10px; margin-top: 6px; }
                .vr-nav .vr-btn-secondary { flex: 0 0 auto; width: auto; padding: 15px 22px; }
                .vr-nav .vr-btn-primary { flex: 1; }

                /* ── ALERTS ───────────────────────────── */
                .vr-alert { border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; font-size: 13px; font-weight: 500; display: flex; align-items: flex-start; gap: 9px; line-height: 1.5; }
                .vr-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
                .vr-alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

                /* ── VERIFY SCREEN & BADGES ───────────── */
                .vr-verify-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 8px 24px; }
                .vr-verify-ring { position: relative; width: 100px; height: 100px; margin-bottom: 24px; }
                .vr-verify-ring-outer { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(37,99,235,0.15); animation: vr-ring-expand 2s ease-out infinite; }
                .vr-verify-ring-mid { position: absolute; inset: 10px; border-radius: 50%; border: 2px solid rgba(37,99,235,0.25); animation: vr-ring-expand 2s ease-out 0.4s infinite; }
                .vr-verify-ring-inner { position: absolute; inset: 20px; border-radius: 50%; background: linear-gradient(135deg, #1d4ed8, #2563eb); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(37,99,235,0.4); }
                @keyframes vr-ring-expand { 0% { opacity: 0.7; transform: scale(0.95); } 100% { opacity: 0; transform: scale(1.2); } }
                .vr-verify-title { font-size: 21px; font-weight: 700; color: #0f172a; margin-bottom: 10px; letter-spacing: -0.3px; }
                .vr-verify-sub { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px; max-width: 320px; }
                .vr-verify-pills { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
                .vr-verify-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; font-size: 11.5px; font-weight: 600; color: #0369a1; font-family: 'DM Mono', monospace; }
                .vr-verified-badge { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid #86efac; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
                .vr-verified-icon { width: 44px; height: 44px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
                .vr-verified-name { font-size: 16px; font-weight: 700; color: #065f46; }
                .vr-verified-sub { font-size: 12px; color: #16a34a; font-weight: 500; margin-top: 2px; }
                .vr-trust { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 16px 0 0; }
                .vr-trust-text { font-family: 'DM Mono', monospace; font-size: 10px; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase; }
                .vr-trust-dot { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
                @keyframes vr-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .vr-step-content { animation: vr-fade-up 0.3s ease; }
            `}</style>

            <div className="vr-root">

                {/* ── STICKY TOP BAR ─────────────────── */}
                {showHeader && (
                    <div className="vr-topbar">
                        <svg className="vr-topbar-shield" width="28" height="32" viewBox="0 0 28 32" fill="none">
                            <path d="M14 1L26 6V15C26 22.5 20.5 29.5 14 31.5C7.5 29.5 2 22.5 2 15V6L14 1Z"
                                fill="url(#ts1)" stroke="rgba(37,99,235,0.2)" strokeWidth="0.5"/>
                            <path d="M9 16L12.5 19.5L19 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <defs>
                                <linearGradient id="ts1" x1="2" y1="1" x2="26" y2="32" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#3b82f6"/>
                                    <stop offset="1" stopColor="#1d4ed8"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="vr-topbar-brand">Vi<span>Secure</span></span>
                        <span className="vr-topbar-tag">Visitor Pass</span>
                    </div>
                )}

                {/* ── BODY ───────────────────────────── */}
                <div className={`vr-body ${mounted ? 'vr-in' : ''}`}>

                    {/* Wizard progress bar */}
                    {showWizard && (
                        <div className="vr-wizard">
                            {wizardSteps.map((label, i) => (
                                <div key={label} style={{display: 'contents'}}>
                                    <div className={`vr-wstep ${wizardIndex === i ? 'active' : wizardIndex > i ? 'done' : ''}`}>
                                        <div className="vr-wstep-circle">
                                            {wizardIndex > i ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                            ) : (i + 1)}
                                        </div>
                                        <span className="vr-wstep-label">{label}</span>
                                    </div>
                                    {i < wizardSteps.length - 1 && (
                                        <div className={`vr-wconnector ${wizardIndex > i ? 'done' : ''}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Alerts ─────────────────────── */}
                    {message && (
                        <div className="vr-alert vr-alert-info">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="vr-alert vr-alert-error">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* ════════════════════════════════════
                        STEP 0 — Mode selection
                    ════════════════════════════════════ */}
                    {step === 0 && (
                        <div className="vr-step-content">
                            <div style={{textAlign:'center', marginBottom: 28}}>
                                <div style={{fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px', marginBottom: 6}}>Welcome</div>
                                <div style={{fontSize: 14, color: '#64748b', lineHeight: 1.5}}>Please select how you'd like to proceed today.</div>
                            </div>

                            <button className="vr-mode-card primary" onClick={() => handleModeSelect('RETURNING')}>
                                <div className="vr-mode-icon" style={{background:'rgba(255,255,255,0.15)'}}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="vr-mode-title">Returning Visitor</div>
                                <div className="vr-mode-sub">I've visited before — use face recognition to sign in quickly.</div>
                                <div className="vr-mode-arrow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </div>
                            </button>

                            <button className="vr-mode-card" onClick={() => handleModeSelect('NEW')}>
                                <div className="vr-mode-icon" style={{background:'#eff6ff'}}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                                    </svg>
                                </div>
                                <div className="vr-mode-title">New Registration</div>
                                <div className="vr-mode-sub">First-time visitor — complete the registration form and face scan.</div>
                                <div className="vr-mode-arrow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </div>
                            </button>

                            <div className="vr-trust" style={{marginTop: 8}}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <span className="vr-trust-text">Secure &amp; Encrypted</span>
                                <div className="vr-trust-dot"/>
                                <span className="vr-trust-text">ViSecure v2.4</span>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════
                        STEP 1 — Personal Identity
                    ════════════════════════════════════ */}
                    {step === 1 && (
                        <form className="vr-step-content" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                            <div className="vr-card">
                                <div className="vr-card-header">
                                    <div className="vr-card-header-icon" style={{background:'#eff6ff'}}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="vr-card-header-title">Personal Information</div>
                                        <div className="vr-card-header-sub">Legal name as it appears on your ID</div>
                                    </div>
                                </div>
                                <div className="vr-card-body">
                                    <div className="vr-row3">
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">First</span></div>
                                            <input className="vr-input capitalize" type="text" name="FirstName" value={formData.FirstName} onChange={handleChange} required placeholder="Juan" />
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Middle</span></div>
                                            <input className="vr-input capitalize" type="text" name="MiddleName" value={formData.MiddleName} onChange={handleChange} required placeholder="G." />
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Last</span></div>
                                            <input className="vr-input capitalize" type="text" name="Surname" value={formData.Surname} onChange={handleChange} required placeholder="Dela Cruz" />
                                        </div>
                                    </div>

                                    <div className="vr-row3">
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Age</span></div>
                                            <input className="vr-input" type="number" name="Age" value={formData.Age} onChange={handleChange} required placeholder="21" min="1" max="120" />
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Sex</span></div>
                                            <select className="vr-select" name="Sex" value={formData.Sex} onChange={handleChange} required>
                                                <option value="" disabled>Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Type</span></div>
                                            <select className="vr-select" name="VisitorType" value={formData.VisitorType} onChange={handleChange}>
                                                {visitorTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formData.VisitorType === 'Others' && (
                                        <div className="vr-field">
                                            <input className="vr-input" type="text" value={customVisitorType} onChange={e => setCustomVisitorType(e.target.value)} placeholder="Please specify visitor type..." required style={{borderColor:'#3b82f6'}} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="vr-card">
                                <div className="vr-card-header">
                                    <div className="vr-card-header-icon" style={{background:'#f0fdf4'}}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.99 3.4 2 2 0 0 1 3.96 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="vr-card-header-title">Contact Details</div>
                                        <div className="vr-card-header-sub">Optional — for emergency notifications</div>
                                    </div>
                                </div>
                                <div className="vr-card-body">
                                    <div className="vr-row2">
                                        <div className="vr-field">
                                            <div className="vr-label">
                                                <span className="vr-label-text">Contact No.</span>
                                                <span className="vr-label-opt">optional</span>
                                            </div>
                                            <input className="vr-input" type="tel" name="ContactNumber" value={formData.ContactNumber} onChange={handleChange} placeholder="09XX XXX XXXX" />
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label">
                                                <span className="vr-label-text">Email</span>
                                                <span className="vr-label-opt">optional</span>
                                            </div>
                                            <input className="vr-input" type="email" name="Email" value={formData.Email} onChange={handleChange} placeholder="juan@example.com" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="vr-nav">
                                <button type="button" className="vr-btn vr-btn-secondary" onClick={handleBack}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                                    </svg>
                                    Back
                                </button>
                                <button type="submit" className="vr-btn vr-btn-primary">
                                    Next: Visit Details
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ════════════════════════════════════
                        STEP 2 — Visit Details OR Scanner
                    ════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="vr-step-content">
                            {showScanner ? (
                                // ── Render Face Scanner Component ──
                                <div className="vr-card">
                                    <div className="vr-card-header">
                                        <div className="vr-card-header-icon" style={{background:'#eff6ff'}}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="vr-card-header-title">Identity Verification</div>
                                            <div className="vr-card-header-sub">Look straight into the camera</div>
                                        </div>
                                    </div>
                                    <div className="vr-card-body">
                                        <FaceScanner onScanComplete={handleScanComplete} onCancel={() => setShowScanner(false)} />
                                    </div>
                                </div>
                            ) : photos.length < 5 ? (
                                // ── Render Visit Details Form ──
                                <form onSubmit={(e) => { e.preventDefault(); setShowScanner(true); }}>
                                    <div className="vr-card">
                                        <div className="vr-card-header">
                                            <div className="vr-card-header-icon" style={{background:'#fdf4ff'}}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="vr-card-header-title">Visit Details</div>
                                                <div className="vr-card-header-sub">Where are you headed today?</div>
                                            </div>
                                        </div>
                                        <div className="vr-card-body">
                                            <div className="vr-row2">
                                                <div className="vr-field">
                                                    <div className="vr-label"><span className="vr-label-text">Department</span></div>
                                                    <select className="vr-select" name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required>
                                                        <option value="" disabled>Select...</option>
                                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                    {formData.DepartmentToVisit === 'Others' && (
                                                        <input className="vr-input" style={{marginTop:8,borderColor:'#3b82f6'}} type="text" value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} placeholder="Specify department..." required />
                                                    )}
                                                </div>
                                                <div className="vr-field">
                                                    <div className="vr-label">
                                                        <span className="vr-label-text">Person to Visit</span>
                                                        <span className="vr-label-opt">optional</span>
                                                    </div>
                                                    <input className="vr-input capitalize" type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} placeholder="Name..." />
                                                </div>
                                            </div>
                                            <div className="vr-field">
                                                <div className="vr-label"><span className="vr-label-text">Purpose of Visit</span></div>
                                                <textarea className="vr-textarea" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required placeholder="Briefly describe your reason for visiting..." autoFocus />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── AI PREP CARD ── */}
                                    <div className="vr-card">
                                        <div className="vr-card-body">
                                            <div className="vr-verify-hero">
                                                <div className="vr-verify-ring">
                                                    <div className="vr-verify-ring-outer" />
                                                    <div className="vr-verify-ring-mid" />
                                                    <div className="vr-verify-ring-inner">
                                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M23 7l-7 5-7-5"/><path d="M1 7l7 5"/><rect x="1" y="5" width="22" height="14" rx="2"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="vr-verify-title">AI Face Scan Next</div>
                                                <div className="vr-verify-sub">After submitting your visit details, you'll proceed to a quick face scan to verify your identity and generate your digital pass.</div>
                                                <div className="vr-verify-pills">
                                                    {['Secure Biometrics', 'Instant Pass', 'AI Verified'].map(p => (
                                                        <span key={p} className="vr-verify-pill">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="vr-nav">
                                        <button type="button" className="vr-btn vr-btn-secondary" onClick={() => { setError(''); setStep(1); }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                                            </svg>
                                            Back
                                        </button>
                                        <button type="submit" className="vr-btn vr-btn-glow">
                                            Proceed to Face Scan
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 1l7 7m0 0l7 7M8 8l7-7M8 8L1 15"/><path d="M23 1l-7 7"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // ── Post-scan confirm ──
                                <div className="vr-step-content">
                                    <div className="vr-card">
                                        <div className="vr-card-body" style={{textAlign:'center', padding:'32px 22px'}}>
                                            <div style={{width:56,height:56,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #86efac',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                            </div>
                                            <div style={{fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:6}}>Scan Complete</div>
                                            <div style={{fontSize:13,color:'#64748b'}}>Biometric data captured successfully.</div>
                                            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'center'}}>
                                                <button className="vr-btn vr-btn-secondary" style={{width:'auto',padding:'12px 20px'}} onClick={() => setPhotos([])}>
                                                    Retake
                                                </button>
                                                <button className="vr-btn vr-btn-primary" style={{width:'auto',padding:'12px 24px'}} onClick={handleSubmit}>
                                                    Submit Registration
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════════
                        STEP 4 — Returning: face scan
                    ════════════════════════════════════ */}
                    {step === 4 && (
                        <div className="vr-step-content">
                            <div className="vr-card">
                                <div className="vr-card-header">
                                    <div className="vr-card-header-icon" style={{background:'#eff6ff'}}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="vr-card-header-title">Identity Verification</div>
                                        <div className="vr-card-header-sub">Look straight into the camera</div>
                                    </div>
                                </div>
                                <div className="vr-card-body">
                                    <FaceScanner onScanComplete={handleScanComplete} onCancel={handleBack} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════
                        STEP 5 — Returning: visit details
                    ════════════════════════════════════ */}
                    {step === 5 && (
                        <form className="vr-step-content" onSubmit={handleSubmit}>
                            <div className="vr-verified-badge">
                                <div className="vr-verified-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                                <div>
                                    <div className="vr-verified-name">Welcome back, {formData.FirstName}!</div>
                                    <div className="vr-verified-sub">Identity verified via biometrics</div>
                                </div>
                            </div>

                            <div className="vr-card">
                                <div className="vr-card-header">
                                    <div className="vr-card-header-icon" style={{background:'#fdf4ff'}}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="vr-card-header-title">Today's Visit</div>
                                        <div className="vr-card-header-sub">Where are you headed?</div>
                                    </div>
                                </div>
                                <div className="vr-card-body">
                                    <div className="vr-row2">
                                        <div className="vr-field">
                                            <div className="vr-label"><span className="vr-label-text">Department</span></div>
                                            <select className="vr-select" name="DepartmentToVisit" value={formData.DepartmentToVisit} onChange={handleChange} required>
                                                <option value="" disabled>Select...</option>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            {formData.DepartmentToVisit === 'Others' && (
                                                <input className="vr-input" style={{marginTop:8,borderColor:'#3b82f6'}} type="text" value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} placeholder="Specify department..." required />
                                            )}
                                        </div>
                                        <div className="vr-field">
                                            <div className="vr-label">
                                                <span className="vr-label-text">Person to Visit</span>
                                                <span className="vr-label-opt">optional</span>
                                            </div>
                                            <input className="vr-input capitalize" type="text" name="PersonToVisit" value={formData.PersonToVisit} onChange={handleChange} placeholder="Name..." />
                                        </div>
                                    </div>
                                    <div className="vr-field">
                                        <div className="vr-label"><span className="vr-label-text">Purpose of Visit</span></div>
                                        <textarea className="vr-textarea" name="PurposeOfVisit" value={formData.PurposeOfVisit} onChange={handleChange} required placeholder="Briefly describe your reason..." autoFocus />
                                    </div>
                                </div>
                            </div>

                            <div className="vr-nav">
                                <button type="button" className="vr-btn vr-btn-secondary" onClick={handleBack}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" className="vr-btn vr-btn-primary">
                                    Confirm Entry
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ════════════════════════════════════
                        STEP 3 — Visitor Pass (success)
                    ════════════════════════════════════ */}
                    {step === 3 && successData && (
                        <div className="vr-step-content">
                            <VisitorPass
                                visitor={{
                                    FullName: successData.name,
                                    AffiliationType: formData.VisitorType,
                                    VisitorID: successData.visitorId
                                }}
                                visitId={successData.visitId}
                                onClose={() => window.location.reload()}
                            />
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}