import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    
    // 🔍 SEARCH & FILTER STATE
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); // 'all', 'risk', 'overstay'

    // 🕒 CONFIG: 24 Hours in milliseconds
    const SESSION_DURATION = 24 * 60 * 60 * 1000; 

    // 💾 STATE: ACTIVITY FEED
    const [activityFeed, setActivityFeed] = useState(() => {
        const savedFeed = localStorage.getItem('visecure_activity_feed');
        return savedFeed ? JSON.parse(savedFeed) : [];
    });

    // 💾 STATE: PROCESSED IDs
    const processedLogIds = useRef(new Set());

    useEffect(() => {
        const savedIds = localStorage.getItem('visecure_processed_ids');
        if (savedIds) {
            processedLogIds.current = new Set(JSON.parse(savedIds));
        }
    }, []);

    const [currentTime, setCurrentTime] = useState(new Date());
    
    // MODAL & ACTION STATES
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [inputMode, setInputMode] = useState(null);
    const [actionReason, setActionReason] = useState(""); 

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!selectedVisitor) {
            setInputMode(null);
            setActionReason("");
        }
    }, [selectedVisitor]);

    useEffect(() => {
        localStorage.setItem('visecure_activity_feed', JSON.stringify(activityFeed));
    }, [activityFeed]);

    // 🕒 SESSION MANAGER
    useEffect(() => {
        const checkSession = () => {
            const savedStart = localStorage.getItem('visecure_session_start');
            const now = Date.now();

            if (!savedStart) {
                localStorage.setItem('visecure_session_start', now);
                addActivity("🚀 SYSTEM STARTED: Monitoring Session Begun", "system", now);
                return;
            }

            if ((now - parseInt(savedStart)) > SESSION_DURATION) {
                const newStart = now;
                localStorage.setItem('visecure_session_start', newStart);
                processedLogIds.current.clear();
                localStorage.removeItem('visecure_processed_ids');
                const endLog = { id: 'sys-end-' + now, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), msg: "🏁 SESSION ENDED: 24h Cycle Complete", type: "system" };
                const startLog = { id: 'sys-start-' + (now + 1), time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), msg: "🚀 SYSTEM STARTED: New Cycle", type: "system" };
                setActivityFeed([startLog, endLog]); 
            }
        };
        checkSession();
        const timer = setInterval(checkSession, 60000); 
        return () => clearInterval(timer);
    }, []);

    const addActivity = (msg, type = 'neutral', customTime = null) => {
        const timeObj = customTime ? new Date(customTime) : new Date();
        const newLog = { id: Date.now() + Math.random(), time: timeObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), msg: msg, type: type };
        setActivityFeed(prev => [newLog, ...prev].slice(0, 100)); 
    };

    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/live-monitor`);
            if (response.data.success) {
                const currentData = response.data.data;
                setVisitors(currentData);
                setOccupancy(response.data.occupancy);
                let hasNewData = false;
                [...currentData].reverse().forEach(v => {
                    if (!processedLogIds.current.has(v.LogID)) {
                        processedLogIds.current.add(v.LogID);
                        hasNewData = true;
                        const isAIFlag = v.IsFlagged == 1;
                        const isManualFlag = v.IsManualFlag == 1;
                        const isWatchlisted = v.visitor?.IsWatchlisted == 1;
                        if (isAIFlag) addActivity(`🤖 AI ALERT: ${v.visitor?.FullName} - Suspicious Intent`, 'danger', v.EntryTimestamp);
                        else if (isWatchlisted) addActivity(`🚫 BANNED USER: ${v.visitor?.FullName} detected!`, 'danger', v.EntryTimestamp);
                        else if (isManualFlag) addActivity(`⚠️ OFFICER FLAG: ${v.visitor?.FullName}`, 'warning', v.EntryTimestamp);
                        else addActivity(`🟢 Entry: ${v.visitor?.FullName}`, 'success', v.EntryTimestamp);
                    }
                });
                if (hasNewData) localStorage.setItem('visecure_processed_ids', JSON.stringify([...processedLogIds.current]));
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); 
        return () => clearInterval(interval);
    }, []);

    // --- HELPER CALCULATIONS ---
    const getDurationHours = (entryTime) => (currentTime - new Date(entryTime)) / 36e5;
    
    // 🧠 SMART FILTER LOGIC
    const filteredVisitors = visitors.filter(log => {
        // 1. Text Search
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (
            log.visitor?.FullName.toLowerCase().includes(term) ||
            log.DepartmentToVisit.toLowerCase().includes(term) ||
            log.PurposeOfVisit.toLowerCase().includes(term)
        );

        // 2. Chip Filter
        let matchesType = true;
        if (filterType === 'risk') {
            matchesType = (log.IsFlagged == 1 || log.IsManualFlag == 1 || log.visitor?.IsWatchlisted == 1);
        } else if (filterType === 'overstay') {
            matchesType = getDurationHours(log.EntryTimestamp) > 4;
        }

        return matchesSearch && matchesType;
    });

    // 🔢 COUNTS FOR CHIPS
    const riskCount = visitors.filter(v => v.IsFlagged == 1 || v.IsManualFlag == 1 || v.visitor?.IsWatchlisted == 1).length;
    const overstayCount = visitors.filter(v => getDurationHours(v.EntryTimestamp) > 4).length;

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
        const reasonToSend = !isBanned ? (actionReason || "Live Dashboard Ban") : null;
        try {
            await axios.post(`${API_BASE}/api/visitors/${selectedVisitor.VisitorID}/toggle-watchlist`, { reason: reasonToSend });
            addActivity(isBanned ? `ℹ️ UNBANNED: ${selectedVisitor.visitor?.FullName}` : `🚫 BANNED: ${selectedVisitor.visitor?.FullName} (${reasonToSend})`, isBanned ? 'neutral' : 'danger');
            setSelectedVisitor(null);
            fetchData();
        } catch (error) { alert("Ban Action Failed"); }
    };

    const handleManualFlag = async () => {
        if (!selectedVisitor) return;
        try {
            const response = await axios.post(`${API_BASE}/api/visit-logs/${selectedVisitor.LogID}/toggle-manual-flag`, { reason: actionReason || "Officer Observation" });
            const isNowFlagged = response.data.is_manual_flag;
            addActivity(isNowFlagged ? `⚠️ MANUAL FLAG: ${selectedVisitor.visitor?.FullName} (${actionReason})` : `ℹ️ FLAG REMOVED: ${selectedVisitor.visitor?.FullName}`, isNowFlagged ? 'warning' : 'neutral');
            setSelectedVisitor(null);
            fetchData();
        } catch (error) { alert("Flag Action Failed"); }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDuration = (entryTime) => {
        const diff = Math.floor((currentTime - new Date(entryTime)) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        let color = '#059669'; 
        if (hours >= 2) color = '#d97706'; 
        if (hours >= 4) color = '#dc2626'; 
        return <span style={{ color, fontWeight: 'bold', fontFamily: 'monospace' }}>{hours}h {minutes}m</span>;
    };

    const getRowStyle = (log) => {
        const hours = getDurationHours(log.EntryTimestamp);
        const isAIFlag = log.IsFlagged == 1;
        const isManualFlag = log.IsManualFlag == 1; 
        const isWatchlisted = log.visitor?.IsWatchlisted == 1;
        if (isAIFlag) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (isWatchlisted) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #b91c1c', cursor: 'pointer' }; 
        if (hours > 4) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (isManualFlag) return { backgroundColor: '#fef9c3', borderLeft: '6px solid #eab308', cursor: 'pointer' }; 
        return { backgroundColor: 'white', borderLeft: '6px solid transparent', cursor: 'pointer', transition: 'all 0.2s' };
    };

    const renderAvatar = (name) => {
        const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        return <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginRight: '12px', flexShrink: 0 }}>{initials}</div>;
    };

    // --- STYLES ---
    const pageGrid = { display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: '20px', height: '85vh' };
    const mainPanel = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' };
    const sidePanel = { backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', overflowY: 'auto' };
    const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textTransform:'uppercase' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', fontSize:'13px', boxSizing: 'border-box', marginTop:'5px', outline:'none' };
    const btnStyle = {
        warning: { padding: '12px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' },
        danger: { padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' },
        secondary: { padding: '12px', background: '#eab308', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' },
        cancel: { padding: '12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600' }
    };
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' };
    const modalBoxStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };

    // Chip Button Helper
    const ChipButton = ({ label, count, active, type, onClick }) => {
        let baseColor = '#e5e7eb';
        let activeColor = '#1f2937';
        let textColor = '#374151';
        let activeText = 'white';

        if (type === 'risk') { baseColor = '#fee2e2'; activeColor = '#dc2626'; textColor = '#b91c1c'; }
        if (type === 'overstay') { baseColor = '#ffedd5'; activeColor = '#ea580c'; textColor = '#9a3412'; }

        return (
            <button 
                onClick={onClick}
                style={{
                    padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s', marginRight: '8px',
                    backgroundColor: active ? activeColor : baseColor,
                    color: active ? activeText : textColor
                }}
            >
                {label} {count > 0 && <span style={{ opacity: 0.8, fontSize: '0.9em', marginLeft: '4px' }}>({count})</span>}
            </button>
        );
    };

    return (
        <div className="fade-in" style={pageGrid}>
            <div style={mainPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>👁️ Live Monitor</h2>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Real-time AI surveillance</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            placeholder="🔍 Search active visitors..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', width: '220px', outline: 'none' }}
                        />
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: occupancy > capacity ? '#ef4444' : '#10b981' }}>
                            {occupancy} <span style={{fontSize: '16px', color: '#9ca3af'}}>/ {capacity}</span>
                        </div>
                    </div>
                </div>

                {/* 🏷️ FILTER CHIPS ROW */}
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginRight: '10px', textTransform: 'uppercase' }}>Filters:</span>
                    <ChipButton label="All Active" count={visitors.length} active={filterType === 'all'} onClick={() => setFilterType('all')} />
                    <ChipButton label="⚠️ High Risk" count={riskCount} active={filterType === 'risk'} type="risk" onClick={() => setFilterType('risk')} />
                    <ChipButton label="🕒 Overstaying" count={overstayCount} active={filterType === 'overstay'} type="overstay" onClick={() => setFilterType('overstay')} />
                </div>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={{...thStyle, width: '60px', textAlign: 'center'}}>Risk</th>
                            <th style={thStyle}>Visitor Details</th>
                            <th style={thStyle}>Department</th>
                            <th style={thStyle}>Timeline</th>
                            <th style={thStyle}>Purpose / Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVisitors.length === 0 ? (
                            <tr><td colSpan="5" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>
                                {searchTerm || filterType !== 'all' ? "No matching visitors found." : "Building is empty."}
                            </td></tr>
                        ) : (
                            filteredVisitors.map(log => {
                                const rowStyle = getRowStyle(log);
                                const isAIFlag = log.IsFlagged == 1;
                                const isManualFlag = log.IsManualFlag == 1; 
                                const isWatchlisted = log.visitor?.IsWatchlisted == 1;
                                const isOverstay = getDurationHours(log.EntryTimestamp) > 4;

                                return (
                                    <tr key={log.LogID} style={rowStyle} onClick={() => setSelectedVisitor(log)} className="hover-scale" title="Click to manage">
                                        <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>
                                            {isWatchlisted && <span title="Banned User">🚫</span>}
                                            {isAIFlag && <span title="AI Suspicion">🤖</span>}
                                            {isManualFlag && <span title="Officer Flag">⚠️</span>}
                                            {!isWatchlisted && !isAIFlag && !isManualFlag && <div style={{width:'8px', height:'8px', background:'#10b981', borderRadius:'50%', margin:'0 auto', opacity:0.3}}></div>}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                {renderAvatar(log.visitor?.FullName)}
                                                <div>
                                                    <div style={{fontWeight: 'bold', color: '#111827'}}>{log.visitor?.FullName}</div>
                                                    <div style={{fontSize: '11px', color: '#6b7280'}}>{log.visitor?.VisitorType || 'Visitor'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e5e7eb', color: '#374151' }}>{log.DepartmentToVisit}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                {formatDuration(log.EntryTimestamp)}
                                                <span style={{fontSize:'11px', color:'#9ca3af', marginTop:'2px'}}>In: {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span style={{color: '#374151'}}>{log.PurposeOfVisit}</span>
                                                {isOverstay && <span style={{fontSize:'10px', color:'#dc2626', fontWeight:'bold', marginTop:'2px'}}>🕒 OVERSTAY ALERT</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div style={sidePanel}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid #374151', paddingBottom: '10px', marginBottom: '20px'}}>
                    <h3 style={{ margin: 0 }}>⚡ Activity Log</h3>
                    <button onClick={() => { if(window.confirm("End Current Session?")) { localStorage.removeItem('visecure_session_start'); localStorage.removeItem('visecure_processed_ids'); localStorage.removeItem('visecure_activity_feed'); window.location.reload(); } }} style={{fontSize: '10px', background:'none', border:'1px solid #ef4444', color:'#ef4444', cursor:'pointer', padding:'2px 6px', borderRadius:'4px'}}>End Session</button>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {activityFeed.map((alert) => {
                        let msgColor = 'white'; let borderColor = '#374151'; let bg = 'rgba(255,255,255,0.05)';
                        if (alert.type === 'danger') { msgColor = '#fca5a5'; borderColor = '#ef4444'; }
                        else if (alert.type === 'warning') { msgColor = '#fde047'; borderColor = '#eab308'; }
                        else if (alert.type === 'success') { msgColor = '#86efac'; borderColor = '#10b981'; }
                        else if (alert.type === 'system') { msgColor = '#93c5fd'; borderColor = '#3b82f6'; bg = 'rgba(59, 130, 246, 0.15)'; } 
                        return (
                            <div key={alert.id} className="fade-in" style={{ padding: '10px', borderLeft: `3px solid ${borderColor}`, backgroundColor: bg, borderRadius: '0 4px 4px 0' }}>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom:'2px' }}>{alert.time}</div>
                                <div style={{ fontSize: '12px', color: msgColor, fontWeight: '500' }}>{alert.msg}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedVisitor && (
                <div style={modalOverlayStyle}>
                    <div style={modalBoxStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #e5e7eb', paddingBottom:'10px'}}>
                            <h2 style={{margin:0, fontSize:'18px'}}>👮‍♂️ Control Panel</h2>
                            <button onClick={() => setSelectedVisitor(null)} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer'}}>✕</button>
                        </div>
                        <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                            <div style={{width:'60px', height:'60px', borderRadius:'8px', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'#9ca3af'}}>{selectedVisitor.visitor?.FullName[0]}</div>
                            <div>
                                <h3 style={{margin:0}}>{selectedVisitor.visitor?.FullName}</h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#6b7280'}}>{selectedVisitor.visitor?.VisitorType} • {selectedVisitor.visitor?.Sex} • {selectedVisitor.visitor?.Age}yo</p>
                            </div>
                        </div>
                        <div style={{background:'#f9fafb', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'13px'}}>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                <div><strong>Department:</strong> {selectedVisitor.DepartmentToVisit}</div>
                                <div><strong>Host:</strong> {selectedVisitor.PersonToVisit || 'N/A'}</div>
                                <div style={{gridColumn:'span 2'}}><strong>Purpose of Visit:</strong> {selectedVisitor.PurposeOfVisit}</div>
                                <div style={{gridColumn:'span 2', marginTop:'5px', display:'flex', flexDirection:'column', gap:'5px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <strong>AI Assessment:</strong> 
                                        {selectedVisitor.IsFlagged == 1 ? <span style={{color:'#dc2626', fontWeight:'bold'}}>🔴 Suspicious</span> : <span style={{color:'#16a34a', fontWeight:'bold'}}>🟢 Safe</span>}
                                    </div>
                                    {selectedVisitor.IsManualFlag == 1 && (
                                        <div style={{display:'flex', justifyContent:'space-between'}}>
                                            <strong>Officer Note:</strong> <span style={{color:'#d97706', fontWeight:'bold'}}>⚠️ {selectedVisitor.ManualFlagReason}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {inputMode === 'flag' ? (
                            <div className="fade-in">
                                <label style={{fontSize:'12px', fontWeight:'bold', color:'#d97706'}}>⚠️ Reason for Flagging:</label>
                                <input type="text" autoFocus value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="e.g. Rude behavior, Loitering..." style={{...inputStyle, border: '1px solid #eab308', background:'#fefce8'}} />
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                                    <button onClick={() => setInputMode(null)} style={btnStyle.cancel}>Cancel</button>
                                    <button onClick={handleManualFlag} style={btnStyle.secondary}>Confirm Flag</button>
                                </div>
                            </div>
                        ) : inputMode === 'ban' ? (
                            <div className="fade-in">
                                <label style={{fontSize:'12px', fontWeight:'bold', color:'#b91c1c'}}>🚫 Reason for Banning:</label>
                                <input type="text" autoFocus value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="e.g. Theft, Harassment..." style={{...inputStyle, border: '1px solid #ef4444', background:'#fef2f2'}} />
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                                    <button onClick={() => setInputMode(null)} style={btnStyle.cancel}>Cancel</button>
                                    <button onClick={handleToggleWatchlist} style={btnStyle.danger}>Confirm Ban</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                <button onClick={() => selectedVisitor.IsManualFlag ? handleManualFlag() : setInputMode('flag')} style={btnStyle.secondary}>{selectedVisitor.IsManualFlag ? "🏳️ Remove Flag" : "⚠️ Flag Behavior"}</button>
                                <button onClick={() => selectedVisitor.visitor?.IsWatchlisted ? handleToggleWatchlist() : setInputMode('ban')} style={btnStyle.danger}>{selectedVisitor.visitor?.IsWatchlisted ? "✅ Unban User" : "🚫 Ban User"}</button>
                                <button onClick={handleForceCheckout} style={{...btnStyle.warning, gridColumn: 'span 2'}}>🚪 Force Checkout (Exit)</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}