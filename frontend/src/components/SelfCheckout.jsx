import { useEffect, useState, useRef } from 'react'; // Import useRef
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function SelfCheckout() {
    const [status, setStatus] = useState('Connecting to ViSecure...');
    const [icon, setIcon] = useState('⏳');
    const navigate = useNavigate();
    
    // THE FIX: This Ref acts like a "Turnstile" - only one person passes at a time
    const hasCheckedOut = useRef(false);

    useEffect(() => {
        const performCheckout = async () => {
            // 1. LOCK THE DOOR: If we already ran this, STOP.
            if (hasCheckedOut.current) return;
            hasCheckedOut.current = true;

            const visitId = localStorage.getItem('active_visit_id');

            // Safety Check
            if (!visitId || visitId === 'undefined' || visitId === 'null') {
                setStatus('No active visit found. Did you register on this device?');
                setIcon('❓');
                return;
            }

            try {
                setStatus('Processing your checkout...');
                
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, {
                    log_id: visitId
                });

                // Success
                setStatus('You are successfully checked out. Goodbye!');
                setIcon('✅');
                localStorage.removeItem('active_visit_id');
                
                // Redirect home after 3 seconds
                setTimeout(() => navigate('/'), 3000);

            } catch (error) {
                console.error("Checkout Error:", error);

                if (error.response?.data?.message === 'Visitor already checked out.') {
                    setStatus('You have already checked out.');
                    setIcon('✅');
                    localStorage.removeItem('active_visit_id');
                    setTimeout(() => navigate('/'), 3000);
                } else {
                    setStatus('Checkout Failed. Please try again or ask a guard.');
                    setIcon('❌');
                    // Reset the lock so they can try again manually if needed
                    hasCheckedOut.current = false; 
                }
            }
        };

        performCheckout();
    }, [navigate]);

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: '#f8f9fa', 
            textAlign: 'center', 
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>{icon}</div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>{status}</h2>
            <p style={{ color: '#777' }}>ViSecure Contactless Exit</p>
        </div>
    );
}