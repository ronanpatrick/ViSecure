import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        setMounted(true);
        if (localStorage.getItem('auth_token')) {
            navigate('/admin');
        }
    }, [navigate]);

    // Animated dot-grid canvas on the left panel
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let t = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cols = 22;
            const rows = 28;
            const gx = canvas.width / cols;
            const gy = canvas.height / rows;

            for (let r = 0; r <= rows; r++) {
                for (let c = 0; c <= cols; c++) {
                    const wave = Math.sin(c * 0.45 + t) * Math.cos(r * 0.35 + t * 0.7);
                    const alpha = 0.08 + wave * 0.13;
                    const radius = 1.2 + wave * 1.4;
                    ctx.beginPath();
                    ctx.arc(c * gx, r * gy, Math.max(0.3, radius), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${Math.max(0.04, alpha)})`;
                    ctx.fill();
                }
            }
            t += 0.008;
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login', { email, password });
            if (response.data.token) {
                localStorage.setItem('auth_token', response.data.token);
                navigate('/admin');
            } else {
                setError('Login failed. No token received.');
            }
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .vl-root {
                    display: flex;
                    height: 100vh;
                    font-family: 'DM Sans', sans-serif;
                    overflow: hidden;
                }

                /* ── LEFT PANEL ─────────────────────────────── */
                .vl-left {
                    position: relative;
                    width: 52%;
                    background: linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 38%, #312e81 72%, #1e1b4b 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 56px;
                    overflow: hidden;
                }

                .vl-canvas {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                /* Decorative hex grid overlay */
                .vl-grid-overlay {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 48px 48px;
                    pointer-events: none;
                }

                /* Top-right glow orb */
                .vl-orb {
                    position: absolute;
                    width: 420px;
                    height: 420px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%);
                    top: -120px;
                    right: -100px;
                    pointer-events: none;
                }
                /* Bottom-left glow orb */
                .vl-orb2 {
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%);
                    bottom: -80px;
                    left: -60px;
                    pointer-events: none;
                }

                .vl-left-content {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0;
                    width: 100%;
                    max-width: 420px;
                }

                .vl-shield {
                    width: 68px;
                    height: 68px;
                    margin-bottom: 32px;
                    filter: drop-shadow(0 8px 24px rgba(99,102,241,0.5));
                    animation: vl-float 4s ease-in-out infinite;
                }
                @keyframes vl-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }

                .vl-brand {
                    font-size: 32px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: -0.5px;
                    margin-bottom: 4px;
                    line-height: 1;
                }
                .vl-brand span {
                    color: #93c5fd;
                }

                .vl-brand-tag {
                    font-family: 'DM Mono', monospace;
                    font-size: 10.5px;
                    color: rgba(147, 197, 253, 0.8);
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    margin-bottom: 40px;
                    font-weight: 500;
                }

                .vl-divider {
                    width: 40px;
                    height: 2px;
                    background: linear-gradient(90deg, #60a5fa, transparent);
                    border-radius: 2px;
                    margin-bottom: 28px;
                }

                .vl-tagline {
                    font-size: 22px;
                    font-weight: 600;
                    color: #ffffff;
                    line-height: 1.4;
                    margin-bottom: 16px;
                    letter-spacing: -0.2px;
                }

                .vl-sub {
                    font-size: 14px;
                    color: rgba(186, 230, 253, 0.75);
                    line-height: 1.65;
                    margin-bottom: 48px;
                    font-weight: 400;
                }

                .vl-pills {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                }

                .vl-pill {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    backdrop-filter: blur(4px);
                }
                .vl-pill-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #60a5fa;
                    flex-shrink: 0;
                    box-shadow: 0 0 6px #60a5fa;
                }
                .vl-pill span {
                    font-size: 12.5px;
                    color: rgba(219, 234, 254, 0.85);
                    font-weight: 500;
                }

                .vl-version {
                    position: absolute;
                    bottom: 24px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-family: 'DM Mono', monospace;
                    font-size: 10px;
                    color: rgba(148, 163, 184, 0.4);
                    letter-spacing: 0.08em;
                    z-index: 2;
                }

                /* ── RIGHT PANEL ─────────────────────────────── */
                .vl-right {
                    width: 48%;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 48px;
                    position: relative;
                }

                /* Subtle right-panel texture */
                .vl-right::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(circle at 80% 20%, rgba(219,234,254,0.4) 0%, transparent 55%),
                                      radial-gradient(circle at 20% 80%, rgba(224,231,255,0.3) 0%, transparent 50%);
                    pointer-events: none;
                }

                .vl-form-card {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 400px;
                    opacity: 0;
                    transform: translateY(16px);
                    transition: opacity 0.5s ease, transform 0.5s ease;
                }
                .vl-form-card.vl-visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Portal badge */
                .vl-portal-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 20px;
                    padding: 4px 12px 4px 8px;
                    margin-bottom: 24px;
                }
                .vl-portal-badge-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #2563eb;
                    box-shadow: 0 0 0 2px #bfdbfe;
                }
                .vl-portal-badge span {
                    font-size: 11px;
                    font-weight: 600;
                    color: #1d4ed8;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    font-family: 'DM Mono', monospace;
                }

                .vl-form-title {
                    font-size: 26px;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.4px;
                    margin-bottom: 6px;
                    line-height: 1.2;
                }
                .vl-form-sub {
                    font-size: 13.5px;
                    color: #64748b;
                    margin-bottom: 32px;
                    line-height: 1.5;
                    font-weight: 400;
                }

                /* Input groups */
                .vl-field {
                    margin-bottom: 16px;
                }
                .vl-label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 6px;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .vl-input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .vl-input-icon {
                    position: absolute;
                    left: 13px;
                    color: #94a3b8;
                    pointer-events: none;
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                }
                .vl-input-wrap.focused .vl-input-icon {
                    color: #2563eb;
                }
                .vl-input {
                    width: 100%;
                    padding: 11px 42px;
                    border-radius: 10px;
                    border: 1.5px solid #e2e8f0;
                    background: #ffffff;
                    font-size: 14px;
                    color: #0f172a;
                    font-family: 'DM Sans', sans-serif;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                }
                .vl-input::placeholder { color: #94a3b8; }
                .vl-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.12), 0 1px 3px rgba(0,0,0,0.04);
                }
                .vl-input-right {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #94a3b8;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                }
                .vl-input-right:hover { color: #334155; }

                /* Row: checkbox + forgot */
                .vl-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 24px;
                    margin-top: 4px;
                }
                .vl-check-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none;
                }
                .vl-check-label input[type="checkbox"] {
                    width: 15px;
                    height: 15px;
                    accent-color: #2563eb;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .vl-check-label span {
                    font-size: 13px;
                    color: #475569;
                    font-weight: 400;
                }
                .vl-forgot {
                    font-size: 13px;
                    color: #2563eb;
                    font-weight: 500;
                    cursor: pointer;
                    text-decoration: none;
                    background: none;
                    border: none;
                    padding: 0;
                    font-family: inherit;
                    transition: color 0.15s;
                }
                .vl-forgot:hover { color: #1d4ed8; text-decoration: underline; }

                /* Login button */
                .vl-btn {
                    width: 100%;
                    padding: 13px;
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'DM Sans', sans-serif;
                    cursor: pointer;
                    letter-spacing: 0.02em;
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
                    box-shadow: 0 4px 14px rgba(37,99,235,0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .vl-btn::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
                    pointer-events: none;
                }
                .vl-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(37,99,235,0.42);
                }
                .vl-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(37,99,235,0.3);
                }
                .vl-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                /* Spinner */
                .vl-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.35);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: vl-spin 0.7s linear infinite;
                }
                @keyframes vl-spin { to { transform: rotate(360deg); } }

                /* Error */
                .vl-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 10px 12px;
                    margin-bottom: 18px;
                    font-size: 13px;
                    color: #b91c1c;
                    font-weight: 500;
                    animation: vl-shake 0.35s ease;
                }
                @keyframes vl-shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-5px)}
                    60%{transform:translateX(5px)}
                }
                @keyframes vl-fade {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* Trust footer */
                .vl-trust {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding-top: 16px;
                    border-top: 1px solid #f1f5f9;
                }
                .vl-trust-text {
                    font-size: 11.5px;
                    color: #94a3b8;
                    font-weight: 500;
                    font-family: 'DM Mono', monospace;
                    letter-spacing: 0.02em;
                }

                /* Divider */
                .vl-sep {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #e2e8f0;
                }
            `}</style>

            <div className="vl-root">

                {/* ── LEFT: BRANDING ───────────────────────── */}
                <div className="vl-left">
                    <canvas ref={canvasRef} className="vl-canvas" />
                    <div className="vl-grid-overlay" />
                    <div className="vl-orb" />
                    <div className="vl-orb2" />

                    <div className="vl-left-content">
                        {/* Shield logo */}
                        <svg className="vl-shield" viewBox="0 0 68 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M34 2L62 13V36C62 52.5 49.5 67.5 34 74C18.5 67.5 6 52.5 6 36V13L34 2Z"
                                fill="url(#sg1)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
                            <path d="M34 8L56 17.5V36C56 50 45 63 34 68.5C23 63 12 50 12 36V17.5L34 8Z"
                                fill="url(#sg2)" opacity="0.6"/>
                            {/* Checkmark */}
                            <path d="M23 38L30 45L45 30" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            {/* Inner ring */}
                            <circle cx="34" cy="38" r="12" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>
                            <defs>
                                <linearGradient id="sg1" x1="6" y1="2" x2="62" y2="74" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#60a5fa"/>
                                    <stop offset="1" stopColor="#818cf8"/>
                                </linearGradient>
                                <linearGradient id="sg2" x1="12" y1="8" x2="56" y2="68" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" stopOpacity="0.2"/>
                                    <stop offset="1" stopColor="white" stopOpacity="0.05"/>
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="vl-brand">Vi<span>Secure</span></div>
                        <div className="vl-brand-tag">University Security Intelligence</div>
                        <div className="vl-divider" />

                        <div className="vl-tagline">Advanced Campus Security<br/>& Visitor Intelligence</div>
                        <div className="vl-sub">
                            A unified security platform for real-time visitor management,
                            access control, and campus intelligence.
                        </div>

                        <div className="vl-pills">
                            {[
                                'Real-time visitor monitoring',
                                'AI-powered threat detection',
                                'End-to-end encrypted sessions',
                            ].map((t, i) => (
                                <div className="vl-pill" key={i}>
                                    <div className="vl-pill-dot" />
                                    <span>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="vl-version">ViSecure v2.4.1 · © 2025 All rights reserved</div>
                </div>

                {/* ── RIGHT: FORM ───────────────────────────── */}
                <div className="vl-right">
                    <div className={`vl-form-card ${mounted ? 'vl-visible' : ''}`}>

                        <div className="vl-portal-badge">
                            <div className="vl-portal-badge-dot" />
                            <span>Admin Portal</span>
                        </div>

                        <h1 className="vl-form-title">Welcome back</h1>
                        <p className="vl-form-sub">Sign in to access the security dashboard.</p>

                        {error && (
                            <div className="vl-error">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin}>

                            {/* Email */}
                            <div className="vl-field">
                                <label className="vl-label">Email Address</label>
                                <div className={`vl-input-wrap ${emailFocused ? 'focused' : ''}`}>
                                    <span className="vl-input-icon">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                    </span>
                                    <input
                                        className="vl-input"
                                        type="email"
                                        placeholder="admin@university.edu"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="vl-field">
                                <label className="vl-label">Password</label>
                                <div className={`vl-input-wrap ${passFocused ? 'focused' : ''}`}>
                                    <span className="vl-input-icon">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    </span>
                                    <input
                                        className="vl-input"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => setPassFocused(true)}
                                        onBlur={() => setPassFocused(false)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="vl-input-right"
                                        onClick={() => setShowPass(!showPass)}
                                        tabIndex={-1}
                                        aria-label={showPass ? 'Hide password' : 'Show password'}
                                    >
                                        {showPass ? (
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember + Forgot */}
                            <div className="vl-row">
                                <label className="vl-check-label">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={e => setRemember(e.target.checked)}
                                    />
                                    <span>Remember this device</span>
                                </label>
                                <button type="button" className="vl-forgot" onClick={() => setShowForgot(!showForgot)}>Forgot password?</button>
                            </div>

                            {/* Forgot password message */}
                            {showForgot && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', marginBottom: 16, animation: 'vl-fade 0.2s ease' }}>
                                    <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    <p style={{ fontSize: 12.5, color: '#1d4ed8', lineHeight: 1.55, margin: 0 }}>
                                        Please contact the <strong>University IT Support</strong> to reset your password.
                                        Reach them at <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11.5 }}>it-support@nud.edu</span>. <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11.5 }}></span>
                                    </p>
                                </div>
                            )}

                            {/* Submit */}
                            <button type="submit" className="vl-btn" disabled={loading}>
                                {loading ? (
                                    <><div className="vl-spinner" /> Authenticating...</>
                                ) : (
                                    <>
                                        Sign in to Dashboard
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                        </svg>
                                    </>
                                )}
                            </button>

                            {/* Trust footer */}
                            <div className="vl-trust">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <span className="vl-trust-text">Authorized Security Personnel Only</span>
                                <div className="vl-sep" />
                                <span className="vl-trust-text">End-to-End Encrypted</span>
                            </div>

                        </form>
                    </div>
                </div>

            </div>
        </>
    );
}