import { useState } from "react";
import QRCode from "react-qr-code";
import axios from 'axios';

export default function VisitorPass({ visitor, visitId, onClose }) {
    const [showQr, setShowQr] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [hasExited, setHasExited] = useState(false); 

    // 🛡️ SECURITY UPDATE: This points to the Guard's Verification screen
    // 🟢 NEW: Points to the public verification page
    const qrData = `${window.location.origin}/verify/${visitor.VisitorID}`;

    const handleSelfCheckout = async () => {
        if (!window.confirm("Are you exiting the building now?")) return;
        
        setIsCheckingOut(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, {
                log_id: visitId,
                method: 'self' 
            });
            
            // 🆕 Clear storage and transition to terminal state.
            localStorage.removeItem('active_visit_id');
            localStorage.removeItem('active_visitor_id'); // 👈 We now clear this too
            localStorage.removeItem('visitor_name');
            localStorage.removeItem('visitor_type');
            setHasExited(true); 
            
        } catch (err) {
            console.error(err);
            alert("❌ Checkout failed. Please see the security guard.");
            setIsCheckingOut(false);
        }
    };

    if (hasExited) {
        return (
            <div style={{...overlayStyle, backgroundColor: '#f8f9fa', backdropFilter: 'none'}}>
                <div style={{...cardStyle, boxShadow: 'none', backgroundColor: 'transparent', textAlign: 'center', padding: '40px 20px'}}>
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>👋</div>
                    <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Successfully Checked Out</h2>
                    <p style={{ color: '#7f8c8d', lineHeight: '1.6' }}>
                        Your visit has been securely logged.<br/>Thank you for visiting ViSecure!
                    </p>
                    <button onClick={() => window.location.href = window.location.pathname} style={{...checkoutBtnStyle, backgroundColor: '#e2e8f0', color: '#475569', marginTop: '40px'}}>
                        Return to Start
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{...overlayStyle, backgroundColor: '#f8f9fa', backdropFilter: 'none'}}>
            <div style={{...cardStyle, width: '100%', maxWidth: '400px', height: '100vh', borderRadius: '0', display: 'flex', flexDirection: 'column'}}>
                
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '1px' }}>ACTIVE PASS</h2>
                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        Identity Verified
                    </div>
                </div>

                <div style={{ padding: '30px', textAlign: 'center', flex: 1, overflowY: 'auto' }}>
                    
                    {!showQr ? (
                        <div className="fade-in">
                            <h3 style={{ color: '#2c3e50', fontSize: '18px', margin: '0 0 10px 0', fontWeight: '600' }}>Registration Successful</h3>
                            <p style={{ color: '#7f8c8d', marginBottom: '30px', fontSize: '14px', lineHeight: '1.5' }}>
                                Keep this pass open on your phone while on the premises.
                            </p>
                            <button onClick={() => setShowQr(true)} style={primaryBtnStyle}>Display Security QR</button>
                        </div>
                    ) : (
                        <div className="fade-in">
                            <p style={{ fontSize: '11px', color: '#95a5a6', marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>Security Code</p>
                            <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '4px', border: '1px solid #dfe6e9' }}>
                                <QRCode value={qrData} size={150} />
                            </div>
                            <button onClick={() => setShowQr(false)} style={textLinkStyle}>Hide Code</button>
                        </div>
                    )}

                    <div style={idCardBoxStyle}>
                        <div style={labelStyle}>Visitor Name</div>
                        <div style={valueStyle}>{visitor.FullName}</div>
                        
                        <div style={{ ...labelStyle, marginTop: '12px' }}>Affiliation</div>
                        <div style={{ ...valueStyle, fontSize: '14px', color: '#7f8c8d' }}>
                            {visitor.AffiliationType || 'General Visitor'}
                        </div>
                    </div>

                    <div style={{marginTop: 'auto', paddingTop: '40px'}}>
                        <button onClick={handleSelfCheckout} disabled={isCheckingOut} style={checkoutBtnStyle}>
                            {isCheckingOut ? 'Processing...' : '🚪 Tap Here to Check-Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- PROFESSIONAL STYLES ---
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000 };
const cardStyle = { backgroundColor: 'white', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" };
const headerStyle = { backgroundColor: '#1e8449', color: 'white', padding: '40px 20px 30px', textAlign: 'center', borderBottom: '4px solid #145a32' };
const primaryBtnStyle = { backgroundColor: '#2c3e50', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', transition: 'background 0.2s' };
const textLinkStyle = { marginTop: '15px', background: 'transparent', color: '#7f8c8d', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', display: 'block', width: '100%' };
const idCardBoxStyle = { marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', textAlign: 'left' };
const labelStyle = { fontSize: '10px', color: '#95a5a6', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' };
const valueStyle = { fontSize: '16px', color: '#2c3e50', fontWeight: '600' };
const checkoutBtnStyle = { width: '100%', padding: '16px', border: 'none', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };