import { useState } from 'react';
import axios from 'axios';

export default function VisitorRegistration() {
    const [formData, setFormData] = useState({
        FullName: '',
        Age: '',
        Sex: '',
        PurposeOfVisit: '',
        PersonToVisit: '',
    });

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/register', formData);
            setMessage('Success! ' + response.data.message);
        } catch (err) {
            console.error(err);
            setError('Registration failed. Check connection.');
        }
    };

    // --- STYLES OBJECTS (Cleaner way to write CSS in React) ---
    const pageStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',           // Force full viewport height
        width: '100vw',            // Force full viewport width
        backgroundColor: '#f0f2f5',
        margin: 0,
        position: 'fixed',         // Ensures it stays on screen
        top: 0,
        left: 0
    };

    const formContainerStyle = {
        width: '100%',
        maxWidth: '400px',
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        color: '#333' // Force text color to dark gray
    };

    const inputStyle = {
        width: '100%',
        padding: '10px',
        marginTop: '5px',
        marginBottom: '15px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        backgroundColor: '#fff', // Force white background for inputs
        color: '#000',           // Force black text
        fontSize: '16px',
        boxSizing: 'border-box' // Prevents padding from breaking width
    };

    const buttonStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: '#0056b3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        fontWeight: 'bold'
    };

    return (
        <div style={pageStyle}>
            <div style={formContainerStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Visitor Registration</h2>
                
                {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <form onSubmit={handleSubmit}>
                    <label><strong>Full Name:</strong></label>
                    <input type="text" name="FullName" onChange={handleChange} required style={inputStyle} />

                    <label><strong>Age:</strong></label>
                    <input type="number" name="Age" onChange={handleChange} required style={inputStyle} />

                    <label><strong>Sex:</strong></label>
                    <select name="Sex" onChange={handleChange} required style={inputStyle}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>

                    <label><strong>Purpose of Visit:</strong></label>
                    <input type="text" name="PurposeOfVisit" onChange={handleChange} required style={inputStyle} />
                    
                    <label><strong>Person to Visit:</strong></label>
                    <input type="text" name="PersonToVisit" onChange={handleChange} style={inputStyle} />

                    <button type="submit" style={buttonStyle}>Register</button>
                </form>
            </div>
        </div>
    );
}