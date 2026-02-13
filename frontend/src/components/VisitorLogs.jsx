import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function VisitorLogs() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [processingId, setProcessingId] = useState(null); 

    // 1. Fetch Data
    const fetchLiveStatus = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/live-monitor`);
            if (response.data.success) {
                setVisitors(response.data.data);
                setOccupancy(response.data.occupancy);
            }
            setLoading(false);
        } catch (error) {
            console.error("Live monitor error:", error);
        }
    };

    useEffect(() => {
        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 3000); 
        return () => clearInterval(interval);
    }, []);

    // 2. Timer Tick
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 3. FORCE CHECKOUT
    const handleForceCheckout = async (logId) => {
        if (!window.confirm("Confirm: Has this visitor physically left the building?")) return;

        setProcessingId(logId); 

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, {
                log_id: logId
            });
            fetchLiveStatus();
        } catch (error) {
            alert("Checkout failed: " + (error.response?.data?.message || "Server Error"));
        } finally {
            setProcessingId(null);
        }
    };

    const getDuration = (entryTime) => {
        if (!entryTime) return '--';
        const start = new Date(entryTime);
        const diff = Math.floor((currentTime - start) / 1000); 

        if (diff < 0) return "Just now";
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    // --- STYLES ---
    const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
    const counterStyle = { fontSize: '36px', fontWeight: 'bold', color: occupancy > capacity ? '#e02424' : '#0e9f6e' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '14px' }; // Added fontSize 14px to fit more
    const thStyle = { backgroundColor: '#f9fafb', padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }; // Added whiteSpace nowrap
    const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f3f4f6', color: '#1f2937' };
    
    const exitBtnStyle = {
        padding: '6px 12px',
        backgroundColor: '#dc3545', 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '12px',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap'
    };

    return (
        <div className="fade-in">
            {/* OCCUPANCY */}
            <div style={cardStyle}>
                <div>
                    <h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Current Occupancy</h3>
                    <div style={counterStyle}>
                        {occupancy} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>/ {capacity}</span>
                    </div>
                </div>
                <div>
                    {occupancy > capacity ? 
                        <span style={{ backgroundColor: '#fde8e8', color: '#c81e1e', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' }}>⚠️ OVER CAPACITY</span> :
                        <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' }}>✅ NORMAL</span>
                    }
                </div>
            </div>

            {/* LIVE TABLE */}
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#111827' }}>👥 People Currently Inside</h3>
            
            {loading ? <p>Loading...</p> : (
                <div style={{ overflowX: 'auto' }}> {/* Makes table scrollable on small screens */}
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Department</th> {/* NEW */}
                                <th style={thStyle}>Purpose</th>    {/* NEW */}
                                <th style={thStyle}>Time In</th>
                                <th style={thStyle}>Duration</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.length === 0 ? (
                                <tr><td colSpan="6" style={{...tdStyle, textAlign: 'center', color: '#9ca3af'}}>The facility is empty.</td></tr>
                            ) : (
                                visitors.map((log) => (
                                    <tr key={log.LogID || log.id}>
                                        <td style={tdStyle}>
                                            <strong>{log.visitor ? log.visitor.FullName : "Unknown"}</strong>
                                        </td>
                                        
                                        {/* NEW: DEPARTMENT COLUMN */}
                                        <td style={tdStyle}>
                                            <span style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#374151', border: '1px solid #e5e7eb' }}>
                                                {log.DepartmentToVisit || '-'}
                                            </span>
                                        </td>

                                        {/* NEW: PURPOSE COLUMN */}
                                        <td style={tdStyle}>
                                            {log.PurposeOfVisit}
                                        </td>

                                        <td style={tdStyle}>
                                            {new Date(log.EntryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={tdStyle} className="tabular-nums">
                                            <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#0056b3' }}>
                                                {getDuration(log.EntryTimestamp)}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button 
                                                onClick={() => handleForceCheckout(log.LogID || log.id)}
                                                style={{...exitBtnStyle, opacity: processingId === (log.LogID || log.id) ? 0.7 : 1}}
                                                disabled={processingId === (log.LogID || log.id)}
                                            >
                                                {processingId === (log.LogID || log.id) ? 'Saving...' : 'Force Exit'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}