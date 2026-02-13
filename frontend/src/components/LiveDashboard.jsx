import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    const [alerts, setAlerts] = useState([]); // 👈 NEW: Live Alerts Feed
    const [currentTime, setCurrentTime] = useState(new Date());

    // 1. POLLING DATA (Visitors + Alerts)
    const fetchData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/live-monitor`);
            if (response.data.success) {
                setVisitors(response.data.data);
                setOccupancy(response.data.occupancy);
                
                // 💡 SIMULATED ALERTS FOR DEMO (Replace with real API later)
                // In a real app, your backend would send the latest 5 'logs' with status 'Banned' or 'Overstay'
                const mockAlerts = [
                    { id: 1, type: 'info', msg: 'System Online. Monitoring started.', time: 'Now' },
                    ...response.data.data.map(v => ({
                        id: v.LogID, 
                        type: 'success', 
                        msg: `${v.visitor?.FullName} entered - ${v.PurposeOfVisit}`, 
                        time: new Date(v.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                    }))
                ].slice(0, 10); // Keep last 10 events
                setAlerts(mockAlerts);
            }
        } catch (error) {
            console.error("Dashboard error:", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); 
        return () => clearInterval(interval);
    }, []);

    // 2. FORCE CHECKOUT
    const handleForceCheckout = async (logId) => {
        if (!window.confirm("Confirm: Force exit this visitor?")) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, { log_id: logId });
            fetchData();
        } catch (error) {
            alert("Checkout failed");
        }
    };

    // 3. GET DURATION
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getDuration = (entryTime) => {
        const start = new Date(entryTime);
        const diff = Math.floor((currentTime - start) / 1000);
        if (diff < 0) return "Just now";
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    // --- STYLES ---
    const pageGrid = { display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', height: '80vh' };
    
    // LEFT PANEL (MONITOR)
    const mainPanel = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' };
    
    // RIGHT PANEL (ALERTS FEED)
    const sidePanel = { backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column' };
    
    // COMPONENT STYLES
    const statCard = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' };
    const bigNumber = { fontSize: '42px', fontWeight: 'bold', color: occupancy > capacity ? '#ef4444' : '#10b981' };
    
    // TABLE
    const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6' };
    
    // ALERT ITEM
    const alertItem = (type) => ({
        padding: '12px',
        marginBottom: '10px',
        borderRadius: '6px',
        fontSize: '13px',
        backgroundColor: type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
        borderLeft: type === 'error' ? '4px solid #ef4444' : '4px solid #10b981'
    });

    return (
        <div className="fade-in" style={pageGrid}>
            
            {/* 🖥️ LEFT: MAIN MONITOR */}
            <div style={mainPanel}>
                <div style={statCard}>
                    <div>
                        <h4 style={{ margin: 0, color: '#6b7280', textTransform: 'uppercase' }}>Building Occupancy</h4>
                        <div style={bigNumber}>{occupancy} <span style={{fontSize: '18px', color: '#9ca3af'}}>/ {capacity}</span></div>
                    </div>
                    {/* Visual Progress Bar (Simple CSS) */}
                    <div style={{ width: '100px', height: '10px', backgroundColor: '#d1d5db', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${(occupancy/capacity)*100}%`, 
                            height: '100%', 
                            backgroundColor: occupancy > capacity ? '#ef4444' : '#10b981',
                            transition: 'width 0.5s'
                        }}></div>
                    </div>
                </div>

                <h3 style={{ marginTop: 0 }}>👥 Active Visitors</h3>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Dept</th>
                            <th style={thStyle}>Time In</th>
                            <th style={thStyle}>Duration</th>
                            <th style={thStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.length === 0 ? (
                            <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', color: '#9ca3af'}}>Building is empty.</td></tr>
                        ) : (
                            visitors.map(log => (
                                <tr key={log.LogID || log.id}>
                                    <td style={tdStyle}><strong>{log.visitor?.FullName}</strong></td>
                                    <td style={tdStyle}><span style={{background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontSize: '11px'}}>{log.DepartmentToVisit || '-'}</span></td>
                                    <td style={tdStyle}>{new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td style={tdStyle} className="tabular-nums">
                                        <span style={{color: '#2563eb', fontWeight: 'bold'}}>{getDuration(log.EntryTimestamp)}</span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button onClick={() => handleForceCheckout(log.LogID || log.id)} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Exit</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 🔔 RIGHT: ALERTS FEED */}
            <div style={sidePanel}>
                <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>⚡ Live Feed</h3>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {alerts.map((alert, idx) => (
                        <div key={idx} style={alertItem(alert.type)}>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{alert.time}</div>
                            <div>{alert.msg}</div>
                        </div>
                    ))}
                    
                    {/* Fake Alert for Visual Demo */}
                    <div style={alertItem('error')}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>08:45 AM</div>
                        <div>⚠️ <strong>BANNED USER ATTEMPT</strong><br/>Match: John Doe (ID: 15)</div>
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                    System Status: 🟢 Online
                </div>
            </div>

        </div>
    );
}