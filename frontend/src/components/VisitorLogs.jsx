import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function VisitorLogs() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); // Hardcoded limit for now
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // 1. Fetch Data (Polled every 3 seconds)
    useEffect(() => {
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

        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 3000); // Poll API
        return () => clearInterval(interval);
    }, []);

    // 2. Local Timer (Updates every 1 second to make the "Duration" tick)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper: Calculate "2h 15m 10s"
    const getDuration = (entryTime) => {
        if (!entryTime) return '--';
        const start = new Date(entryTime);
        const diff = Math.floor((currentTime - start) / 1000); // Difference in seconds

        if (diff < 0) return "Just now";

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    // --- STYLES ---
    const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
    const counterStyle = { fontSize: '36px', fontWeight: 'bold', color: occupancy > capacity ? '#e02424' : '#0e9f6e' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const thStyle = { backgroundColor: '#f9fafb', padding: '15px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' };
    const tdStyle = { padding: '15px', borderBottom: '1px solid #f3f4f6', color: '#1f2937' };

    return (
        <div className="fade-in">
            {/* 1. OCCUPANCY SCORECARD */}
            <div style={cardStyle}>
                <div>
                    <h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Current Occupancy</h3>
                    <div style={counterStyle}>
                        {occupancy} <span style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 'normal' }}>/ {capacity}</span>
                    </div>
                </div>
                <div>
                    {occupancy > capacity && <span style={{ backgroundColor: '#fde8e8', color: '#c81e1e', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' }}>⚠️ OVER CAPACITY</span>}
                    {occupancy <= capacity && <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' }}>✅ NORMAL</span>}
                </div>
            </div>

            {/* 2. LIVE TABLE */}
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#111827' }}>👥 People Currently Inside</h3>
            
            {loading ? <p>Loading...</p> : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Entry Time</th>
                            <th style={thStyle}>Duration (Live)</th>
                            <th style={thStyle}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.length === 0 ? (
                            <tr><td colSpan="4" style={{...tdStyle, textAlign: 'center', color: '#9ca3af'}}>The facility is empty.</td></tr>
                        ) : (
                            visitors.map((log) => (
                                <tr key={log.LogID || log.id}> {/* Ensure this matches your DB Primary Key */}
                                    <td style={tdStyle}>
                                        <strong>{log.visitor ? log.visitor.FullName : "Unknown"}</strong>
                                    </td>
                                    <td style={tdStyle}>
                                        {new Date(log.EntryTimestamp).toLocaleTimeString()}
                                    </td>
                                    <td style={tdStyle} className="tabular-nums">
                                        {/* This creates the ticking effect */}
                                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#0056b3' }}>
                                            {getDuration(log.EntryTimestamp)}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ backgroundColor: '#e1effe', color: '#1e429f', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            INSIDE
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}