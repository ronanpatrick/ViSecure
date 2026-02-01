import { useState } from "react";
import QRCode from "react-qr-code";

export default function VisitorPass({ visitor, visitId, onClose }) {
    // State to toggle the QR Code
    const [showQr, setShowQr] = useState(false);

    const qrData = JSON.stringify({
        type: 'VISIT_EXIT',
        log_id: visitId,
        name: visitor.FullName
    });

    return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                {/* PROFESSIONAL HEADER */}
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '1px' }}>ACCESS GRANTED</h2>
                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        Identity Verified
                    </div>
                </div>

                <div style={{ padding: '30px', textAlign: 'center' }}>
                    
                    {/* TOGGLE AREA */}
                    {!showQr ? (
                        <div className="fade-in">
                            <h3 style={{ color: '#2c3e50', fontSize: '18px', margin: '0 0 10px 0', fontWeight: '600' }}>Registration Successful</h3>
                            <p style={{ color: '#7f8c8d', marginBottom: '30px', fontSize: '14px', lineHeight: '1.5' }}>
                                Your entry has been authorized.<br/>Please proceed to your destination.
                            </p>
                            
                            <button onClick={() => setShowQr(true)} style={primaryBtnStyle}>
                                Display Security Pass
                            </button>
                        </div>
                    ) : (
                        <div className="fade-in">
                            <p style={{ fontSize: '11px', color: '#95a5a6', marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Security Clearance Code
                            </p>
                            
                            <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '4px', border: '1px solid #dfe6e9' }}>
                                <QRCode value={qrData} size={150} />
                            </div>

                            <button onClick={() => setShowQr(false)} style={textLinkStyle}>
                                Hide Code
                            </button>
                        </div>
                    )}

                    {/* OFFICIAL ID CARD SECTION */}
                    <div style={idCardBoxStyle}>
                        <div style={labelStyle}>Visitor Name</div>
                        <div style={valueStyle}>{visitor.FullName}</div>
                        
                        <div style={{ ...labelStyle, marginTop: '12px' }}>Affiliation</div>
                        <div style={{ ...valueStyle, fontSize: '14px', color: '#7f8c8d' }}>
                            {visitor.AffiliationType || 'General Visitor'}
                        </div>
                    </div>

                    <button onClick={onClose} style={closeBtnStyle}>
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- PROFESSIONAL STYLES ---
const overlayStyle = { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    backdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', 
    zIndex: 1000 
};

const cardStyle = { 
    backgroundColor: 'white', 
    borderRadius: '8px', 
    width: '90%', maxWidth: '380px', 
    overflow: 'hidden', 
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
};

const headerStyle = { 
    backgroundColor: '#1e8449', // Professional Emerald Green
    color: 'white', 
    padding: '30px 20px', 
    textAlign: 'center',
    borderBottom: '4px solid #145a32' // Darker green accent
};

const primaryBtnStyle = { 
    backgroundColor: '#2c3e50', 
    color: 'white', 
    padding: '12px 24px', 
    border: 'none', 
    borderRadius: '4px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '13px', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    transition: 'background 0.2s'
};

const textLinkStyle = { 
    marginTop: '15px', 
    background: 'transparent', 
    color: '#7f8c8d', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '12px', 
    textDecoration: 'underline',
    display: 'block', width: '100%'
};

const idCardBoxStyle = {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    textAlign: 'left'
};

const labelStyle = {
    fontSize: '10px',
    color: '#95a5a6',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '4px'
};

const valueStyle = {
    fontSize: '16px',
    color: '#2c3e50',
    fontWeight: '600'
};

const closeBtnStyle = { 
    marginTop: '20px', 
    width: '100%', 
    padding: '14px', 
    border: '1px solid #dfe6e9', 
    backgroundColor: 'white', 
    color: '#7f8c8d', 
    fontWeight: '600', 
    borderRadius: '4px', 
    cursor: 'pointer',
    fontSize: '13px',
    textTransform: 'uppercase'
};