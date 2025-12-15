import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // <--- Hook for navigation

export default function AdminDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // <--- Initialize navigation

    // 1. Fetch data from Laravel when the page loads
    useEffect(() => {
        fetchVisitors();
    }, []);

    // 2. LOGOUT FUNCTION
    const handleLogout = () => {
        localStorage.removeItem('auth_token'); // Throw away the key
        navigate('/login'); // Send them back to the gate
    };

    const fetchVisitors = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/visitors');
            setVisitors(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    // --- STYLES ---
    const pageStyle = {
        padding: '40px',
        backgroundColor: '#f0f2f5',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        tableLayout: 'fixed' // <--- Keeps columns locked in place
    };

    const thStyle = {
        backgroundColor: '#0056b3',
        color: 'white',
        padding: '12px',
        textAlign: 'left'
    };

    const tdStyle = {
        padding: '12px',
        borderBottom: '1px solid #ddd',
        color: '#333'
    };

    // Button Style
    const logoutBtnStyle = {
        padding: '10px 20px',
        backgroundColor: '#dc3545', // Red
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold'
    };

    return (
        <div style={pageStyle}>
            {/* Header + Logout Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ color: '#333', margin: 0 }}>Admin Dashboard: Visitor Records</h1>
                <button onClick={handleLogout} style={logoutBtnStyle}>
                    Logout
                </button>
            </div>
            
            {loading ? (
                <p>Loading records...</p>
            ) : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            {/* Corrected Widths (Total = 100%) */}
                            <th style={{ ...thStyle, width: '5%' }}>ID</th>
                            <th style={{ ...thStyle, width: '25%' }}>Full Name</th>
                            <th style={{ ...thStyle, width: '5%' }}>Age</th>
                            <th style={{ ...thStyle, width: '10%' }}>Sex</th>
                            <th style={{ ...thStyle, width: '40%' }}>Purpose</th>
                            <th style={{ ...thStyle, width: '15%' }}>Date Registered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.map((visitor) => (
                            <tr key={visitor.VisitorID}>
                                <td style={tdStyle}>{visitor.VisitorID}</td>
                                <td style={tdStyle}><strong>{visitor.FullName}</strong></td>
                                <td style={tdStyle}>{visitor.Age}</td>
                                <td style={tdStyle}>{visitor.Sex}</td>
                                <td style={tdStyle}>
                                    {visitor.logs && visitor.logs.length > 0 
                                        ? visitor.logs[visitor.logs.length - 1].PurposeOfVisit 
                                        : 'N/A'}
                                </td>
                                <td style={tdStyle}>
                                    {new Date(visitor.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}