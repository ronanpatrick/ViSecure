import QRCode from "react-qr-code";

export default function VisitorPass({ visitor, visitId, onClose }) {
    // The data we want to encode in the QR (e.g., the specific Visit Log ID)
    // This allows the admin to scan it and say "Visit #123 is now closed"
    const qrData = JSON.stringify({
        type: 'VISIT_EXIT',
        log_id: visitId,
        name: visitor.FullName
    });

    return (
        <div style={overlayStyle}>
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>ViSecure Pass</h2>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>OFFICIAL VISITOR</span>
                </div>

                <div style={{ padding: '30px', textAlign: 'center' }}>
                    {/* The QR Code */}
                    <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <QRCode value={qrData} size={180} />
                    </div>

                    <h3 style={{ color: '#2c3e50', margin: '20px 0 5px 0' }}>{visitor.FullName}</h3>
                    <p style={{ color: '#7f8c8d', margin: 0, fontSize: '14px' }}>
                        {visitor.AffiliationType || 'Guest'}
                    </p>

                    <div style={infoBoxStyle}>
                        <small>Present this code to security<br/>upon exit.</small>
                    </div>

                    <button onClick={onClose} style={closeBtnStyle}>
                        Close Pass
                    </button>
                </div>
            </div>
        </div>
    );
}

// STYLES
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const cardStyle = { backgroundColor: 'white', borderRadius: '15px', width: '90%', maxWidth: '350px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const headerStyle = { backgroundColor: '#2c3e50', color: 'white', padding: '20px', textAlign: 'center' };
const infoBoxStyle = { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px', marginTop: '20px', fontSize: '12px', color: '#6c757d' };
const closeBtnStyle = { marginTop: '20px', width: '100%', padding: '12px', border: 'none', backgroundColor: '#e74c3c', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' };