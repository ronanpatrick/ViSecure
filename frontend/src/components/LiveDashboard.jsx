import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    const [activityFeed, setActivityFeed] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Modal State
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [manualReason, setManualReason] = useState(""); 

    const processedLogIds = useRef(new Set());
    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    // --- 1. HELPER: Add to Feed ---
    const addActivity = (msg, type = 'neutral') => {
        const newLog = {
            id: Date.now() + Math.random(), 
            time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            msg: msg,
            type: type
        };
        setActivityFeed(prev => [newLog, ...prev].slice(0, 20)); 
    };

    // --- 2. POLLING ---
    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/live-monitor`);
            if (response.data.success) {
                const currentData = response.data.data;
                setVisitors(currentData);
                setOccupancy(response.data.occupancy);
                
                currentData.forEach(v => {
                    if (!processedLogIds.current.has(v.LogID)) {
                        processedLogIds.current.add(v.LogID);
                        
                        // Robust checks (handle 1/0 or true/false)
                        const isAIFlag = v.IsFlagged == 1;
                        const isManualFlag = v.IsManualFlag == 1;
                        const isWatchlisted = v.visitor?.IsWatchlisted == 1;

                        if (isAIFlag) addActivity(`🤖 AI ALERT: ${v.visitor?.FullName} - Suspicious Intent`, 'danger');
                        else if (isWatchlisted) addActivity(`🚫 BANNED USER: ${v.visitor?.FullName} detected!`, 'danger');
                        else if (isManualFlag) addActivity(`⚠️ OFFICER FLAG: ${v.visitor?.FullName}`, 'warning');
                        else addActivity(`🟢 Entry: ${v.visitor?.FullName}`, 'success');
                    }
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); 
        return () => clearInterval(interval);
    }, []);

    // --- ACTIONS ---

    const handleForceCheckout = async () => {
        if (!selectedVisitor) return;
        if (!window.confirm(`Force exit ${selectedVisitor.visitor?.FullName}?`)) return;
        try {
            await axios.post(`${API_BASE}/api/admin/checkout`, { log_id: selectedVisitor.LogID });
            addActivity(`🚪 FORCED EXIT: ${selectedVisitor.visitor?.FullName}`, 'neutral');
            setSelectedVisitor(null);
            fetchData();
        } catch (error) { alert("Action Failed"); }
    };

    const handleToggleWatchlist = async () => {
        if (!selectedVisitor) return;
        const isBanned = selectedVisitor.visitor?.IsWatchlisted == 1;
        try {
            await axios.post(`${API_BASE}/api/visitors/${selectedVisitor.VisitorID}/toggle-watchlist`, {
                reason: "Live Dashboard Ban"
            });
            // 🛑 BAN = DANGER (Red), UNBAN = NEUTRAL
            addActivity(
                isBanned ? `ℹ️ UNBANNED: ${selectedVisitor.visitor?.FullName}` : `🚫 BANNED: ${selectedVisitor.visitor?.FullName}`, 
                isBanned ? 'neutral' : 'danger' 
            );
            setSelectedVisitor(null);
            fetchData();
        } catch (error) { alert("Ban Action Failed"); }
    };

    const handleManualFlag = async () => {
        if (!selectedVisitor) return;
        try {
            const response = await axios.post(`${API_BASE}/api/visit-logs/${selectedVisitor.LogID}/toggle-manual-flag`, {
                reason: manualReason || "Officer Observation"
            });
            
            const isNowFlagged = response.data.is_manual_flag;
            
            addActivity(
                isNowFlagged ? `⚠️ MANUAL FLAG: ${selectedVisitor.visitor?.FullName} (${manualReason})` : `ℹ️ FLAG REMOVED: ${selectedVisitor.visitor?.FullName}`, 
                isNowFlagged ? 'warning' : 'neutral'
            );

            setManualReason(""); 
            setSelectedVisitor(null);
            fetchData();
        } catch (error) { 
            console.error(error);
            alert("Flag Action Failed. Ensure backend route '/toggle-manual-flag' exists."); 
        }
    };

    // --- RENDER HELPERS ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getDurationHours = (entryTime) => (currentTime - new Date(entryTime)) / 36e5;

    const formatDuration = (entryTime) => {
        const diff = Math.floor((currentTime - new Date(entryTime)) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        
        let color = '#059669'; // Green
        if (hours >= 2) color = '#d97706'; // Orange
        if (hours >= 4) color = '#dc2626'; // Red

        return <span style={{ color, fontWeight: 'bold', fontFamily: 'monospace' }}>{hours}h {minutes}m</span>;
    };

    // 🎨 ROW COLOR LOGIC
    const getRowStyle = (log) => {
        const hours = getDurationHours(log.EntryTimestamp);
        // Ensure boolean/integer compatibility
        const isAIFlag = log.IsFlagged == 1;
        const isManualFlag = log.IsManualFlag == 1; 
        const isWatchlisted = log.visitor?.IsWatchlisted == 1;

        // 🔴 PRIORITY 1: CRITICAL (Red)
        if (isAIFlag) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (isWatchlisted) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #b91c1c', cursor: 'pointer' }; 
        if (hours > 4) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 

        // 🟡 PRIORITY 2: WARNING (Yellow)
        if (isManualFlag) return { backgroundColor: '#fef9c3', borderLeft: '6px solid #eab308', cursor: 'pointer' }; 

        // ⚪ PRIORITY 3: SAFE (White)
        return { backgroundColor: 'white', borderLeft: '6px solid transparent', cursor: 'pointer', transition: 'all 0.2s' };
    };

    const renderAvatar = (name) => {
        const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        return (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginRight: '12px', flexShrink: 0 }}>
                {initials}
            </div>
        );
    };

    // --- STYLES ---
    const pageGrid = { display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: '20px', height: '85vh' };
    const mainPanel = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' };
    const sidePanel = { backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', overflowY: 'auto' };
    const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textTransform:'uppercase' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };

    return (
        <div className="fade-in" style={pageGrid}>
            
            {/* 🖥️ LEFT: MAIN MONITOR */}
            <div style={mainPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>👁️ Live Monitor</h2>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Real-time AI surveillance</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: occupancy > capacity ? '#ef4444' : '#10b981' }}>
                            {occupancy} <span style={{fontSize: '16px', color: '#9ca3af'}}>/ {capacity}</span>
                        </div>
                    </div>
                </div>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Identity</th>
                            <th style={thStyle}>Location</th>
                            <th style={thStyle}>Purpose & Alerts</th>
                            <th style={thStyle}>In Time</th>
                            <th style={thStyle}>Duration</th>
                            <th style={{...thStyle, textAlign:'center'}}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.length === 0 ? (
                            <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>Building is empty.</td></tr>
                        ) : (
                            visitors.map(log => {
                                const rowStyle = getRowStyle(log);
                                const isAIFlag = log.IsFlagged == 1;
                                const isManualFlag = log.IsManualFlag == 1; 
                                const isWatchlisted = log.visitor?.IsWatchlisted == 1;
                                const isOverstay = getDurationHours(log.EntryTimestamp) > 4;

                                return (
                                    <tr key={log.LogID} style={rowStyle} onClick={() => setSelectedVisitor(log)} className="hover-scale">
                                        
                                        {/* 1. IDENTITY */}
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                {renderAvatar(log.visitor?.FullName)}
                                                <div>
                                                    <div style={{fontWeight: 'bold', color: '#111827'}}>
                                                        {log.visitor?.FullName}
                                                    </div>
                                                    <div style={{fontSize: '11px', color: '#6b7280'}}>
                                                        {log.visitor?.VisitorType || 'Visitor'} • {log.visitor?.Sex}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* 2. LOCATION */}
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e5e7eb', color: '#374151' }}>
                                                {log.DepartmentToVisit}
                                            </span>
                                        </td>

                                        {/* 3. PURPOSE & ALERTS */}
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span style={{color: '#374151'}}>{log.PurposeOfVisit}</span>
                                                
                                                {/* 🔴 AI ALERT */}
                                                {isAIFlag && (
                                                    <span style={{fontSize:'10px', fontWeight:'bold', color:'#b91c1c', display:'flex', alignItems:'center', marginTop:'4px', gap:'4px'}}>
                                                        🤖 AI DETECTED: Suspicious Intent
                                                    </span>
                                                )}

                                                {/* 🟡 MANUAL ALERT */}
                                                {isManualFlag && (
                                                    <span style={{fontSize:'10px', fontWeight:'bold', color:'#d97706', display:'flex', alignItems:'center', marginTop:'4px', gap:'4px'}}>
                                                        ⚠️ OFFICER NOTE: {log.ManualFlagReason}
                                                    </span>
                                                )}

                                                {/* 🚫 WATCHLIST ALERT */}
                                                {isWatchlisted && (
                                                    <span style={{fontSize:'10px', fontWeight:'bold', color:'#b91c1c', display:'flex', alignItems:'center', marginTop:'4px', gap:'4px'}}>
                                                        🚫 BANNED USER
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 4. TIME */}
                                        <td style={tdStyle}>
                                            <div style={{color: '#374151', fontSize: '13px'}}>
                                                {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        
                                        {/* 5. DURATION */}
                                        <td style={tdStyle}>
                                            {formatDuration(log.EntryTimestamp)}
                                        </td>

                                        {/* 6. RISK ICONS */}
                                        <td style={{...tdStyle, textAlign:'center', fontSize:'16px'}}>
                                            {isWatchlisted && '🚫'}
                                            {isAIFlag && '🤖'}
                                            {isManualFlag && '⚠️'}
                                            {isOverstay && '🕒'}
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
                <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>⚡ Activity Log</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {activityFeed.map((alert) => {
                        let msgColor = 'white';
                        let borderColor = '#374151'; 
                        if (alert.type === 'danger') { msgColor = '#fca5a5'; borderColor = '#ef4444'; }
                        else if (alert.type === 'warning') { msgColor = '#fde047'; borderColor = '#eab308'; }
                        else if (alert.type === 'success') { msgColor = '#86efac'; borderColor = '#10b981'; }

                        return (
                            <div key={alert.id} className="fade-in" style={{ 
                                padding: '10px', borderLeft: `3px solid ${borderColor}`,
                                backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0 4px 4px 0'
                            }}>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom:'2px' }}>{alert.time}</div>
                                <div style={{ fontSize: '12px', color: msgColor, fontWeight: '500' }}>{alert.msg}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 🛠️ VISITOR CONTROL MODAL */}
            {selectedVisitor && (
                <div style={modalOverlayStyle}>
                    <div style={modalBoxStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #e5e7eb', paddingBottom:'10px'}}>
                            <h2 style={{margin:0, fontSize:'18px'}}>👮‍♂️ Control Panel</h2>
                            <button onClick={() => setSelectedVisitor(null)} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer'}}>✕</button>
                        </div>
                        
                        <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                            <div style={{
                                width:'60px', height:'60px', borderRadius:'8px', background:'#f3f4f6', 
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'#9ca3af'
                            }}>
                                {selectedVisitor.visitor?.FullName[0]}
                            </div>
                            <div>
                                <h3 style={{margin:0}}>{selectedVisitor.visitor?.FullName}</h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#6b7280'}}>
                                    {selectedVisitor.visitor?.VisitorType} • {selectedVisitor.visitor?.Sex} • {selectedVisitor.visitor?.Age}yo
                                </p>
                                <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#6b7280'}}>📞 {selectedVisitor.visitor?.ContactNumber || 'No Contact'}</p>
                            </div>
                        </div>

                        <div style={{background:'#f9fafb', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'13px'}}>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                <div><strong>Dept:</strong> {selectedVisitor.DepartmentToVisit}</div>
                                <div><strong>Host:</strong> {selectedVisitor.PersonToVisit || 'N/A'}</div>
                                <div style={{gridColumn:'span 2'}}><strong>Purpose:</strong> {selectedVisitor.PurposeOfVisit}</div>
                                
                                {/* AI & MANUAL STATUS DISPLAY */}
                                <div style={{gridColumn:'span 2', marginTop:'5px', display:'flex', flexDirection:'column', gap:'5px'}}>
                                    {/* AI STATUS */}
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <strong>AI Assessment:</strong> 
                                        {selectedVisitor.IsFlagged == 1 ? 
                                            <span style={{color:'#dc2626', fontWeight:'bold'}}>🔴 Suspicious Intent</span> : 
                                            <span style={{color:'#16a34a', fontWeight:'bold'}}>🟢 Safe</span>
                                        }
                                    </div>
                                    
                                    {/* MANUAL STATUS */}
                                    {selectedVisitor.IsManualFlag == 1 && (
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <strong>Officer Note:</strong>
                                            <span style={{color:'#d97706', fontWeight:'bold'}}>⚠️ {selectedVisitor.ManualFlagReason}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 🟡 MANUAL FLAG INPUT */}
                        {!selectedVisitor.IsManualFlag && (
                            <div style={{marginBottom: '15px'}}>
                                <label style={{fontSize:'12px', fontWeight:'bold', color:'#d97706'}}>⚠️ Officer Flag (Optional)</label>
                                <input 
                                    type="text" 
                                    value={manualReason}
                                    onChange={(e) => setManualReason(e.target.value)}
                                    placeholder="Enter reason (e.g. Rude behavior)..."
                                    style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fbbf24', background:'#fffbeb', fontSize:'13px', boxSizing: 'border-box', marginTop:'5px'}}
                                />
                            </div>
                        )}

                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            {/* BUTTON 1: MANUAL FLAG */}
                            <button onClick={handleManualFlag} style={btnStyle.secondary}>
                                {selectedVisitor.IsManualFlag ? "🏳️ Remove Flag" : "⚠️ Flag Behavior"}
                            </button>

                            {/* BUTTON 2: BAN */}
                            <button onClick={handleToggleWatchlist} style={btnStyle.danger}>
                                {selectedVisitor.visitor?.IsWatchlisted ? "✅ Unban User" : "🚫 Ban User"}
                            </button>
                            
                            {/* BUTTON 3: FORCE EXIT */}
                            <button onClick={handleForceCheckout} style={{...btnStyle.warning, gridColumn: 'span 2'}}>
                                🚪 Force Checkout (Exit)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- STYLES ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' };
const modalBoxStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };

const btnStyle = {
    warning: { padding: '12px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' }, // Dark Gray
    danger: { padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' }, // Red
    secondary: { padding: '12px', background: '#eab308', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' } // Yellow
};