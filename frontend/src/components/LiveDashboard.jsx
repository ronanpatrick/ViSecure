import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    const [alerts, setAlerts] = useState([]); 
    const [currentTime, setCurrentTime] = useState(new Date());

    // 1. POLLING DATA
    const fetchData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/live-monitor`);
            if (response.data.success) {
                setVisitors(response.data.data);
                setOccupancy(response.data.occupancy);
                
                // GENERATE ALERTS
                const newAlerts = response.data.data.map(v => {
                    const isWatchlisted = v.visitor?.IsWatchlisted === 1 || v.visitor?.IsWatchlisted === true; 
                    const isSuspicious = isSuspiciousPurpose(v.PurposeOfVisit);
                    
                    // Default: Green (Success)
                    let type = 'success';
                    let msg = `${v.visitor?.FullName} entered`;

                    // 🔴 PRIORITY 1: Suspicious (RED)
                    if (isSuspicious) {
                        type = 'danger';
                        msg = `❓ SUSPICIOUS: ${v.visitor?.FullName} (${v.PurposeOfVisit})`;
                    } 
                    // 🟡 PRIORITY 2: Watchlist (YELLOW)
                    else if (isWatchlisted) {
                        type = 'warning';
                        msg = `⚠️ WATCHLIST: ${v.visitor?.FullName}`;
                    }

                    return {
                        id: v.LogID, 
                        type: type, 
                        msg: msg,
                        time: new Date(v.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                    };
                });
                
                // Keep the last 10 alerts
                setAlerts(newAlerts.slice(0, 10));
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

    // 2. HELPER: Check for Suspicious Purpose
    const isSuspiciousPurpose = (purpose) => {
        if (!purpose) return true;
        const lower = purpose.toLowerCase();
        const vagueWords = ['stuff', 'unknown', 'n/a', 'visiting', 'none', 'just looking', '.'];
        return vagueWords.some(word => lower.includes(word));
    };

    // 3. HELPER: Get Row Color based on status
    const getRowStyle = (log) => {
        const hoursInside = (currentTime - new Date(log.EntryTimestamp)) / 1000 / 3600;
        const isWatchlisted = log.visitor?.IsWatchlisted === 1 || log.visitor?.IsWatchlisted === true;
        const isSuspicious = isSuspiciousPurpose(log.PurposeOfVisit);

        // 🔴 PRIORITY 1: Suspicious Purpose -> RED
        if (isSuspicious) return { backgroundColor: '#fee2e2' }; 

        // 🔴 PRIORITY 2: Overstay (> 4 Hours) -> RED
        if (hoursInside > 4) return { backgroundColor: '#fee2e2' };

        // 🟡 PRIORITY 3: Watchlist Flag -> YELLOW
        if (isWatchlisted) return { backgroundColor: '#fef08a' }; 

        // ⚪ Default
        return { backgroundColor: 'white' };
    };

    // 4. FORCE CHECKOUT
    const handleForceCheckout = async (logId) => {
        if (!window.confirm("Confirm: Force exit this visitor?")) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/checkout`, { log_id: logId });
            fetchData();
        } catch (error) {
            alert("Checkout failed");
        }
    };

    // 5. TICKER
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
    const mainPanel = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' };
    const sidePanel = { backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6' };

    return (
        <div className="fade-in" style={pageGrid}>
            
            {/* 🖥️ LEFT: MAIN MONITOR */}
            <div style={mainPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>👁️ Live Monitor</h2>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Real-time visitor tracking</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: occupancy > capacity ? '#ef4444' : '#10b981' }}>
                            {occupancy} <span style={{fontSize: '16px', color: '#9ca3af'}}>/ {capacity}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Current Occupancy</div>
                    </div>
                </div>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Purpose</th>
                            <th style={thStyle}>Dept</th>
                            <th style={thStyle}>Time In</th>
                            <th style={thStyle}>Duration</th>
                            <th style={thStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.length === 0 ? (
                            <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>Building is empty.</td></tr>
                        ) : (
                            visitors.map(log => {
                                const rowStyle = getRowStyle(log);
                                const isSuspicious = isSuspiciousPurpose(log.PurposeOfVisit);
                                const isWatchlisted = log.visitor?.IsWatchlisted === 1;

                                return (
                                    <tr key={log.LogID || log.id} style={rowStyle}>
                                        <td style={tdStyle}>
                                            <strong>{log.visitor?.FullName}</strong>
                                            {isWatchlisted && <span style={{marginLeft:'5px'}}>⚠️</span>}
                                        </td>
                                        
                                        <td style={tdStyle}>
                                            {isSuspicious ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b91c1c', fontWeight: 'bold' }}>
                                                    <span>❓ {log.PurposeOfVisit}</span>
                                                </div>
                                            ) : (
                                                <span>{log.PurposeOfVisit}</span>
                                            )}
                                        </td>

                                        <td style={tdStyle}>{log.DepartmentToVisit || '-'}</td>
                                        <td style={tdStyle}>{new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        
                                        <td style={tdStyle} className="tabular-nums">
                                            <strong>{getDuration(log.EntryTimestamp)}</strong>
                                        </td>

                                        <td style={tdStyle}>
                                            <button 
                                                onClick={() => handleForceCheckout(log.LogID || log.id)} 
                                                style={{
                                                    color: '#b91c1c',
                                                    backgroundColor: 'white', 
                                                    border: '1px solid #b91c1c', 
                                                    borderRadius: '4px', 
                                                    padding: '5px 10px', 
                                                    cursor: 'pointer', 
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                Force Exit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 🔔 RIGHT: ACTIVITY FEED */}
            <div style={sidePanel}>
                <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>⚡ Activity Feed</h3>
                {alerts.map((alert, idx) => {
                    let msgColor = 'white';
                    let borderColor = '#374151'; 
                    
                    if (alert.type === 'danger') {
                        // 🔴 SUSPICIOUS / OVERSTAY -> RED
                        msgColor = '#fca5a5'; 
                        borderColor = '#ef4444'; 
                    } else if (alert.type === 'warning') {
                        // 🟡 WATCHLIST -> YELLOW
                        msgColor = '#fde047'; 
                        borderColor = '#eab308'; 
                    } else {
                        // 🟢 NORMAL -> GREEN
                        msgColor = '#86efac'; 
                        borderColor = '#10b981'; 
                    }

                    return (
                        <div key={idx} style={{ 
                            marginBottom: '10px', 
                            paddingBottom: '10px', 
                            borderLeft: `4px solid ${borderColor}`,
                            paddingLeft: '10px',
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            borderRadius: '0 4px 4px 0'
                        }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom:'2px' }}>{alert.time}</div>
                            <div style={{ fontSize: '13px', color: msgColor, fontWeight: '500' }}>{alert.msg}</div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}