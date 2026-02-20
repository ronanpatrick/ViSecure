import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import axios from 'axios';

// ── All original logic preserved exactly ────────────────────────────────────

export default function VisitorPass({ visitor, visitId, onClose }) {
    const [showQr, setShowQr] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [hasExited, setHasExited] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);

    const qrData = `${window.location.origin}/verify/${visitor.VisitorID}`;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Background listener for admin force-exits — unchanged
    useEffect(() => {
        if (hasExited) return;

        const checkStatus = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visitors/${visitor.VisitorID}`);
                if (res.data && res.data.logs) {
                    const currentLog = res.data.logs.find(l => String(l.LogID) === String(visitId));
                    if (currentLog && currentLog.ExitTimestamp !== null) {
                        clearLocalData();
                    }
                }
            } catch (err) {
                console.error("Background sync error:", err);
            }
        };

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [hasExited, visitId, visitor.VisitorID]);

    const clearLocalData = () => {
        localStorage.removeItem('active_visit_id');
        localStorage.removeItem('active_visitor_id');
        localStorage.removeItem('visitor_name');
        localStorage.removeItem('visitor_type');
        setHasExited(true);
    };

    const handleSelfCheckout = async () => {
        setIsCheckingOut(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, {
                log_id: visitId,
                method: 'self'
            });
            clearLocalData();
        } catch (err) {
            console.error(err);
            alert("Checkout failed. Please see the security guard.");
            setIsCheckingOut(false);
        }
    };

    // ── Checked-out / force-exit state ──────────────────────────────────────
    if (hasExited) {
        return (
            <>
                <style>{STYLES}</style>
                <div className="vp-root vp-exited-root">
                    <div className={`vp-exited-card ${mounted ? 'vp-in' : ''}`}>
                        {/* Animated checkmark */}
                        <div className="vp-exit-icon-wrap">
                            <div className="vp-exit-ring vp-exit-ring-1" />
                            <div className="vp-exit-ring vp-exit-ring-2" />
                            <div className="vp-exit-circle">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                        </div>

                        <div className="vp-exited-title">Visit Complete</div>
                        <div className="vp-exited-name">{visitor.FullName}</div>
                        <div className="vp-exited-sub">Your visit has been securely logged and your campus pass has been deactivated.</div>

                        <div className="vp-exited-log-row">
                            <div className="vp-exited-log-item">
                                <div className="vp-exited-log-label">Status</div>
                                <div className="vp-exited-log-val" style={{color:'#10b981'}}>Checked Out</div>
                            </div>
                            <div className="vp-exited-log-sep"/>
                            <div className="vp-exited-log-item">
                                <div className="vp-exited-log-label">Time</div>
                                <div className="vp-exited-log-val">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                            </div>
                            <div className="vp-exited-log-sep"/>
                            <div className="vp-exited-log-item">
                                <div className="vp-exited-log-label">Pass ID</div>
                                <div className="vp-exited-log-val" style={{fontFamily:'DM Mono, monospace', fontSize:11}}>#{String(visitId).slice(-6)}</div>
                            </div>
                        </div>

                        <div className="vp-exited-thank">Thank you for visiting the university. Have a safe trip!</div>

                        <button className="vp-home-btn" onClick={() => window.location.href = window.location.pathname}>
                            Return to Home
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ── Active Pass ──────────────────────────────────────────────────────────
    return (
        <>
            <style>{STYLES}</style>
            <div className="vp-root">
                <div className={`vp-pass-wrap ${mounted ? 'vp-in' : ''}`}>

                    {/* ── THE CARD ─────────────────────────── */}
                    <div className="vp-card">

                        {/* Holographic shimmer strip at top */}
                        <div className="vp-holo-strip" />

                        {/* Card header */}
                        <div className="vp-card-header">
                            {/* Diagonal mesh pattern */}
                            <div className="vp-header-mesh" />

                            <div className="vp-header-top">
                                {/* Shield + brand */}
                                <div className="vp-brand">
                                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none">
                                        <path d="M10 0.5L19 4.5V11C19 16.5 15 21.5 10 23C5 21.5 1 16.5 1 11V4.5L10 0.5Z"
                                            fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
                                        <path d="M6.5 11.5L9 14L13.5 9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="vp-brand-name">ViSecure</span>
                                </div>

                                {/* Live dot */}
                                <div className="vp-live-badge">
                                    <div className="vp-live-dot" />
                                    <span>ACTIVE</span>
                                </div>
                            </div>

                            <div className="vp-header-pass-label">CAMPUS PASS</div>

                            {/* Visitor name — the hero element */}
                            <div className="vp-visitor-name">{visitor.FullName}</div>
                            <div className="vp-visitor-type">{visitor.AffiliationType || 'General Visitor'}</div>

                            {/* Punch-hole notch effect at bottom of header */}
                            <div className="vp-notch vp-notch-left" />
                            <div className="vp-notch vp-notch-right" />
                            <div className="vp-zigzag" />
                        </div>

                        {/* Card body */}
                        <div className="vp-card-body">

                            {/* Meta row */}
                            <div className="vp-meta-row">
                                <div className="vp-meta-item">
                                    <div className="vp-meta-label">Pass ID</div>
                                    <div className="vp-meta-val mono">#{String(visitId).slice(-8).toUpperCase()}</div>
                                </div>
                                <div className="vp-meta-divider"/>
                                <div className="vp-meta-item">
                                    <div className="vp-meta-label">Issued</div>
                                    <div className="vp-meta-val mono">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                </div>
                                <div className="vp-meta-divider"/>
                                <div className="vp-meta-item">
                                    <div className="vp-meta-label">Visitor ID</div>
                                    <div className="vp-meta-val mono">#{String(visitor.VisitorID).slice(-6)}</div>
                                </div>
                            </div>

                            {/* Dashed separator */}
                            <div className="vp-dashed-sep"/>

                            {/* QR Section */}
                            <div className="vp-qr-section">
                                {showQr ? (
                                    <div className="vp-qr-visible">
                                        <div className="vp-qr-label">Security Checkpoint Code</div>
                                        <div className="vp-qr-frame">
                                            {/* Corner brackets */}
                                            <div className="vp-qr-corner vp-qr-corner-tl"/>
                                            <div className="vp-qr-corner vp-qr-corner-tr"/>
                                            <div className="vp-qr-corner vp-qr-corner-bl"/>
                                            <div className="vp-qr-corner vp-qr-corner-br"/>
                                            <div className="vp-qr-inner">
                                                <QRCode value={qrData} size={160} level="M" />
                                            </div>
                                        </div>
                                        <div className="vp-qr-sublabel">Present to security checkpoint scanner</div>
                                        <button className="vp-qr-toggle hide" onClick={() => setShowQr(false)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                            Hide Code
                                        </button>
                                    </div>
                                ) : (
                                    <div className="vp-qr-hidden">
                                        <div className="vp-qr-hidden-icon">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                                                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                                                <rect x="19" y="14" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/>
                                                <rect x="18" y="19" width="3" height="2"/>
                                            </svg>
                                        </div>
                                        <div className="vp-qr-hidden-text">Security QR Code Hidden</div>
                                        <div className="vp-qr-hidden-sub">Tap to reveal at checkpoint only</div>
                                        <button className="vp-qr-toggle show" onClick={() => setShowQr(true)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                            Show Security Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="vp-dashed-sep"/>

                            {/* Keep pass visible notice */}
                            <div className="vp-notice">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>Keep this pass open while on campus premises</span>
                            </div>
                        </div>
                    </div>

                    {/* ── CHECKOUT BUTTON ───────────────────────── */}
                    {!confirmVisible ? (
                        <button className="vp-checkout-btn" onClick={() => setConfirmVisible(true)}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                <polyline points="16 17 21 12 16 7"/>
                                <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                            Exit Building &amp; Check Out
                        </button>
                    ) : (
                        <div className="vp-confirm-box">
                            <div className="vp-confirm-text">Confirm you are exiting the building?</div>
                            <div className="vp-confirm-row">
                                <button className="vp-confirm-cancel" onClick={() => setConfirmVisible(false)}>
                                    Cancel
                                </button>
                                <button className="vp-confirm-yes" onClick={handleSelfCheckout} disabled={isCheckingOut}>
                                    {isCheckingOut ? (
                                        <><div className="vp-spinner"/>Processing...</>
                                    ) : (
                                        <>Yes, Check Me Out</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="vp-footer-brand">
                        <span>Powered by</span>
                        <strong>ViSecure</strong>
                        <span>· University Security Intelligence</span>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.vp-root {
    position: fixed;
    inset: 0;
    background: #e8edf2;
    background-image:
        radial-gradient(circle at 20% 20%, rgba(219,234,254,0.6) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(209,250,229,0.4) 0%, transparent 50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-y: auto;
    z-index: 1000;
    font-family: 'DM Sans', sans-serif;
    padding: 24px 16px 40px;
}

.vp-exited-root {
    justify-content: center;
    padding: 24px 16px;
}

/* ── Entrance animation ── */
.vp-pass-wrap, .vp-exited-card {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    transition: opacity 0.5s ease, transform 0.5s ease;
    width: 100%;
    max-width: 400px;
}
.vp-pass-wrap.vp-in, .vp-exited-card.vp-in {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* ══════════════════════════════════════
   THE CARD
══════════════════════════════════════ */
.vp-card {
    background: #ffffff;
    border-radius: 24px;
    box-shadow:
        0 10px 40px rgba(0,0,0,0.1),
        0 2px 8px rgba(0,0,0,0.06),
        0 0 0 1px rgba(0,0,0,0.04);
    overflow: hidden;
    position: relative;
    margin-bottom: 14px;
}

/* Holographic shimmer strip */
.vp-holo-strip {
    height: 3px;
    background: linear-gradient(90deg,
        #60a5fa, #a78bfa, #34d399, #fbbf24, #f472b6, #60a5fa
    );
    background-size: 200% 100%;
    animation: vp-holo-shift 3s linear infinite;
}
@keyframes vp-holo-shift {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
}

/* ── Card Header ── */
.vp-card-header {
    background: linear-gradient(145deg, #0f2d6e 0%, #1d4ed8 50%, #1e40af 100%);
    padding: 22px 24px 36px;
    position: relative;
    overflow: hidden;
}

/* Diagonal mesh texture */
.vp-header-mesh {
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.03) 1px,
            transparent 1px,
            transparent 12px
        );
    pointer-events: none;
}

.vp-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
}

.vp-brand {
    display: flex;
    align-items: center;
    gap: 7px;
}
.vp-brand-name {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.03em;
}

.vp-live-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(16,185,129,0.2);
    border: 1px solid rgba(16,185,129,0.4);
    border-radius: 20px;
    padding: 4px 10px;
}
.vp-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 0 rgba(16,185,129,0.5);
    animation: vp-live-pulse 1.8s ease-in-out infinite;
}
@keyframes vp-live-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
    50% { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
}
.vp-live-badge span {
    font-family: 'DM Mono', monospace;
    font-size: 9.5px;
    font-weight: 500;
    color: #34d399;
    letter-spacing: 0.12em;
}

.vp-header-pass-label {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    color: rgba(147,197,253,0.7);
    letter-spacing: 0.25em;
    margin-bottom: 10px;
    position: relative;
    z-index: 1;
}

.vp-visitor-name {
    font-size: 26px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.4px;
    line-height: 1.1;
    margin-bottom: 6px;
    position: relative;
    z-index: 1;
}
.vp-visitor-type {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 11.5px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    position: relative;
    z-index: 1;
    letter-spacing: 0.03em;
}

/* Punch-hole notches */
.vp-notch {
    position: absolute;
    bottom: -16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e8edf2;
    z-index: 3;
}
.vp-notch-left { left: -16px; }
.vp-notch-right { right: -16px; }

/* Zigzag ticket tear */
.vp-zigzag {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(-135deg, #fff 25%, transparent 25%) -8px 0,
                linear-gradient(135deg, #fff 25%, transparent 25%) -8px 0,
                linear-gradient(-45deg, #fff 25%, transparent 25%),
                linear-gradient(45deg, #fff 25%, transparent 25%);
    background-size: 16px 8px;
    background-color: #1d4ed8;
}

/* ── Card Body ── */
.vp-card-body {
    padding: 22px 22px 20px;
}

/* Meta row */
.vp-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}
.vp-meta-item {
    flex: 1;
    text-align: center;
}
.vp-meta-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
}
.vp-meta-val {
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
}
.vp-meta-val.mono {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
}
.vp-meta-divider {
    width: 1px;
    height: 28px;
    background: #f1f5f9;
    flex-shrink: 0;
}

/* Dashed separator */
.vp-dashed-sep {
    border: none;
    border-top: 1.5px dashed #e2e8f0;
    margin: 0 -4px 18px;
}

/* QR Section */
.vp-qr-section { margin-bottom: 14px; }

.vp-qr-visible {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: vp-fade-in 0.25s ease;
}
.vp-qr-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 14px;
}
.vp-qr-frame {
    position: relative;
    padding: 14px;
    background: #fff;
    border-radius: 16px;
    border: 1.5px solid #e2e8f0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    margin-bottom: 10px;
}
/* Corner brackets on QR frame */
.vp-qr-corner {
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: #2563eb;
    border-style: solid;
}
.vp-qr-corner-tl { top: -1px; left: -1px; border-width: 2.5px 0 0 2.5px; border-radius: 4px 0 0 0; }
.vp-qr-corner-tr { top: -1px; right: -1px; border-width: 2.5px 2.5px 0 0; border-radius: 0 4px 0 0; }
.vp-qr-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 2.5px 2.5px; border-radius: 0 0 0 4px; }
.vp-qr-corner-br { bottom: -1px; right: -1px; border-width: 0 2.5px 2.5px 0; border-radius: 0 0 4px 0; }
.vp-qr-inner { display: block; }

.vp-qr-sublabel {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 12px;
    text-align: center;
}

.vp-qr-hidden {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    background: #f8fafc;
    border: 1.5px dashed #cbd5e1;
    border-radius: 16px;
    animation: vp-fade-in 0.25s ease;
}
.vp-qr-hidden-icon {
    width: 56px;
    height: 56px;
    background: #f1f5f9;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    border: 1px solid #e2e8f0;
}
.vp-qr-hidden-text {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 4px;
}
.vp-qr-hidden-sub {
    font-size: 11.5px;
    color: #94a3b8;
    margin-bottom: 14px;
    text-align: center;
}

/* Toggle buttons */
.vp-qr-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
}
.vp-qr-toggle.show {
    background: #fff;
    border-color: #2563eb;
    color: #2563eb;
}
.vp-qr-toggle.show:hover { background: #eff6ff; }
.vp-qr-toggle.hide {
    background: transparent;
    border-color: #e2e8f0;
    color: #64748b;
}
.vp-qr-toggle.hide:hover { background: #f8fafc; }

/* Notice */
.vp-notice {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 10px;
    font-size: 11.5px;
    color: #64748b;
    line-height: 1.4;
    font-weight: 500;
}

/* ══════════════════════════════════════
   CHECKOUT BUTTON
══════════════════════════════════════ */
.vp-checkout-btn {
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    border: 2px solid #fca5a5;
    background: #fff5f5;
    color: #b91c1c;
    font-size: 15px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    transition: all 0.2s;
    margin-bottom: 10px;
    letter-spacing: 0.01em;
}
.vp-checkout-btn:hover {
    background: #fee2e2;
    border-color: #f87171;
    box-shadow: 0 4px 14px rgba(239,68,68,0.15);
}

.vp-confirm-box {
    background: #fff;
    border: 1.5px solid #fca5a5;
    border-radius: 16px;
    padding: 18px;
    margin-bottom: 10px;
    animation: vp-fade-in 0.2s ease;
}
.vp-confirm-text {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
    margin-bottom: 14px;
}
.vp-confirm-row {
    display: flex;
    gap: 10px;
}
.vp-confirm-cancel {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    color: #64748b;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
}
.vp-confirm-cancel:hover { background: #f8fafc; }
.vp-confirm-yes {
    flex: 2;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #ef4444;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: background 0.15s;
    box-shadow: 0 4px 12px rgba(239,68,68,0.3);
}
.vp-confirm-yes:hover:not(:disabled) { background: #dc2626; }
.vp-confirm-yes:disabled { opacity: 0.7; cursor: not-allowed; }

.vp-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: vp-spin 0.7s linear infinite;
}
@keyframes vp-spin { to { transform: rotate(360deg); } }

/* Footer */
.vp-footer-brand {
    text-align: center;
    font-size: 10.5px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.02em;
    margin-top: 4px;
}
.vp-footer-brand strong { color: #64748b; font-weight: 600; }

/* ══════════════════════════════════════
   CHECKED OUT STATE
══════════════════════════════════════ */
.vp-exited-card {
    background: #fff;
    border-radius: 28px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    padding: 44px 32px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.vp-exit-icon-wrap {
    position: relative;
    width: 90px;
    height: 90px;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.vp-exit-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid rgba(16,185,129,0.2);
    animation: vp-exit-ring-grow 2s ease-out infinite;
}
.vp-exit-ring-1 { inset: 0; animation-delay: 0s; }
.vp-exit-ring-2 { inset: 10px; animation-delay: 0.5s; }
@keyframes vp-exit-ring-grow {
    0% { opacity: 0.8; transform: scale(0.9); }
    100% { opacity: 0; transform: scale(1.3); }
}
.vp-exit-circle {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(16,185,129,0.35);
    position: relative;
    z-index: 2;
    animation: vp-check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes vp-check-pop {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.vp-exited-title {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.4px;
    margin-bottom: 6px;
}
.vp-exited-name {
    font-size: 16px;
    font-weight: 600;
    color: #10b981;
    margin-bottom: 12px;
}
.vp-exited-sub {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 28px;
    max-width: 280px;
}

.vp-exited-log-row {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 0;
    width: 100%;
    margin-bottom: 20px;
}
.vp-exited-log-item {
    flex: 1;
    text-align: center;
    padding: 0 8px;
}
.vp-exited-log-sep {
    width: 1px;
    height: 32px;
    background: #e2e8f0;
    flex-shrink: 0;
}
.vp-exited-log-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 5px;
}
.vp-exited-log-val {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
}

.vp-exited-thank {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.5;
    margin-bottom: 28px;
    font-style: italic;
}

.vp-home-btn {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: none;
    background: #0f172a;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    letter-spacing: 0.01em;
}
.vp-home-btn:hover {
    background: #1e293b;
    transform: translateY(-1px);
}

/* Utility animations */
@keyframes vp-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
}
`;