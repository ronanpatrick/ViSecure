import { useState } from 'react';
import QrReader from 'react-qr-scanner'; // or 'react-qr-reader'
import axios from 'axios';

export default function CheckoutScanner({ onClose, onSuccess }) {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('Scanning...');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = async (data) => {
        if (data && !isProcessing) {
            setIsProcessing(true); // Lock it so we don't scan 50 times
            setScanResult(data);
            
            try {
                // The QR data is a JSON string, so we parse it
                // Format: {"type":"VISIT_EXIT","log_id":15,"name":"..."}
                const parsedData = JSON.parse(data.text);

                if (parsedData.type !== 'VISIT_EXIT') {
                    setStatus('Invalid QR Code Type');
                    setIsProcessing(false);
                    return;
                }

                setStatus(`Processing checkout for ${parsedData.name}...`);

                // Call the Backend
                const response = await axios.post('http://127.0.0.1:8000/api/admin/checkout', {
                    log_id: parsedData.log_id
                });

                setStatus('✅ Checkout Complete!');
                
                // Wait 1.5s then close so the user sees the success message
                setTimeout(() => {
                    onSuccess(parsedData.log_id); // Tell parent to update table
                }, 1500);

            } catch (error) {
                console.error("Checkout Error:", error);
                setStatus('❌ Error: ' + (error.response?.data?.message || 'Scan Failed'));
                setIsProcessing(false); // Unlock to try again
            }
        }
    };

    const handleError = (err) => {
        console.error(err);
        setStatus('Camera Error: Check permissions');
    };

    // STYLES
    const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
    const modalStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '90%', maxWidth: '400px', textAlign: 'center' };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h3>Scan Visitor Pass</h3>
                
                <div style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '8px', backgroundColor: '#000', marginBottom: '15px' }}>
                    <QrReader
                        delay={300}
                        style={{ width: '100%', height: '100%' }} // Removed objectFit
                        onError={handleError}
                        onScan={handleScan}
                        // We explicitly tell it to try the default user camera
                        constraints={{ video: true }} 
                    />
                </div>

                <div style={{ fontWeight: 'bold', color: status.includes('✅') ? 'green' : status.includes('❌') ? 'red' : '#333' }}>
                    {status}
                </div>

                <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 20px', border: 'none', backgroundColor: '#e74c3c', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}