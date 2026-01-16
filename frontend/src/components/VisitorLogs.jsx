import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VisitorLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch data from Laravel API
    useEffect(() => {
        // We use axios here for consistency
        axios.get('http://127.0.0.1:8000/api/logs')
            .then(response => {
                if (response.data.success) {
                    setLogs(response.data.data);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching logs:", error);
                setLoading(false);
            });
    }, []);

    // --- STYLES (Matching AdminDashboard) ---
    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '20px'
    };

    const thStyle = {
        backgroundColor: '#0056b3', // Same Blue
        color: 'white',
        padding: '12px',
        textAlign: 'left'
    };

    const tdStyle = {
        padding: '12px',
        borderBottom: '1px solid #ddd',
        color: '#333'
    };

    // Helper for Status Badge Color
    const getStatusStyle = (status) => ({
        padding: '5px 10px',
        borderRadius: '15px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: status === 'GRANTED' ? '#28a745' : '#dc3545', // Green or Red
        display: 'inline-block'
    });

    return (
        <div style={{ marginTop: '40px' }}>
            <h2 style={{ color: '#0056b3', marginBottom: '10px' }}>🕒 Live Visitor History (AI Scans)</h2>
            
            {loading ? (
                <p>Loading records...</p>
            ) : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '30%' }}>Name</th>
                            <th style={{ ...thStyle, width: '20%' }}>Status</th>
                            <th style={{ ...thStyle, width: '50%' }}>Time Scanned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td style={tdStyle}><strong>{log.name}</strong></td>
                                <td style={tdStyle}>
                                    <span style={getStatusStyle(log.status)}>
                                        {log.status}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    {new Date(log.visited_at).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                                    No scans recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default VisitorLogs;