import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook to move between pages

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login', {
                email: email,
                password: password
            });

            if (response.data.status === 'success') {
                // Save a "flag" that says we are logged in
                localStorage.setItem('auth_token', 'LOGGED_IN'); 
                
                // Redirect to the Dashboard
                navigate('/admin');
            }
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    // --- STYLES ---
    const pageStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: 'Arial, sans-serif'
    };

    const cardStyle = {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        boxSizing: 'border-box' // Ensures padding doesn't widen the box
    };

    const buttonStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: '#0056b3',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold'
    };

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Admin Login</h2>
                
                {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

                <form onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                        required
                    />
                    <button type="submit" style={buttonStyle}>Login</button>
                </form>
            </div>
        </div>
    );
}