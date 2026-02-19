import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); 

    const SESSION_DURATION = 24 * 60 * 60 * 1000; 
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const [activityFeed, setActivityFeed] = useState(() => {
        const savedFeed = localStorage.getItem('visecure_activity_feed');
        return savedFeed ? JSON.parse(savedFeed) : [];
    });
    
    const processedLogIds = useRef(new Set());

    useEffect(() => {
        const savedIds = localStorage.getItem('visecure_processed_ids');
        if (savedIds) processedLogIds.current = new Set(JSON.parse(savedIds));
    }, []);

    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [inputMode, setInputMode] = useState(null); 
    const [actionReason, setActionReason] = useState(""); 

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!selectedVisitor) { setInputMode(null); setActionReason(""); }
    }, [selectedVisitor]);

    useEffect(() => { localStorage.setItem('visecure_activity_feed', JSON.stringify(activityFeed)); }, [activityFeed]);

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
                localStorage.setItem('visecure_session_start', now);
                processedLogIds.current.clear();
                localStorage.removeItem('visecure_processed_ids');
                setActivityFeed([{ id: 'sys-start-' + now, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), msg: "🚀 SYSTEM STARTED: New Cycle", type: "system" }]); 
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

    // --- 🛠️ UPDATED FETCH DATA & FEED LOGIC ---
    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/live-monitor`);
            if (response.data.success) {
                const currentData = response.data.data;
                setVisitors(currentData);
                setOccupancy(response.data.occupancy);
                let hasNewData = false;
                
                [...currentData].reverse().forEach(v => {
                    // Unique keys for different types of alerts
                    const entryKey = `${v.LogID}_entry`;
                    const overstayKey = `${v.LogID}_overstay`;
                    
                    const isBanned = v.visitor?.Status === 'Banned';
                    const isWatchlisted = v.visitor?.IsWatchlisted == 1 && !isBanned;
                    // Check if the AI flag is an overstay flag
                    const isOverstayFlag = v.FlagReason && v.FlagReason.includes("Overstay");
                    const isAIFlag = v.IsFlagged == 1 && !isOverstayFlag;

                    // 1. Process initial Entry / Standard Flags
                    if (!processedLogIds.current.has(entryKey)) {
                        processedLogIds.current.add(entryKey);
                        hasNewData = true;

                        if (isBanned) addActivity(`🚫 BANNED ENTRY: ${v.visitor?.FullName} detected!`, 'danger', v.EntryTimestamp);
                        else if (isWatchlisted) addActivity(`⚠️ WATCHLIST: ${v.visitor?.FullName} has entered.`, 'warning', v.EntryTimestamp);
                        else if (isAIFlag) addActivity(`🤖 AI ALERT: ${v.visitor?.FullName} - Suspicion`, 'danger', v.EntryTimestamp);
                        else addActivity(`🟢 Entry: ${v.visitor?.FullName}`, 'success', v.EntryTimestamp);
                    }

                    // 2. Process Overstays (Can happen hours AFTER entry)
                    if (isOverstayFlag && !processedLogIds.current.has(overstayKey)) {
                        processedLogIds.current.add(overstayKey);
                        hasNewData = true;
                        addActivity(`🕒 OVERSTAY ALERT: ${v.visitor?.FullName} (> 4hrs)`, 'danger', new Date()); // Logs it at CURRENT time
                    }
                });

                if (hasNewData) localStorage.setItem('visecure_processed_ids', JSON.stringify([...processedLogIds.current]));
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchData(); const interval = setInterval(fetchData, 3000); return () => clearInterval(interval); }, []);
    useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);

    const getDurationHours = (entryTime) => (currentTime - new Date(entryTime)) / 36e5;
    
    const filteredVisitors = visitors.filter(log => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (log.visitor?.FullName.toLowerCase().includes(term) || log.DepartmentToVisit.toLowerCase().includes(term) || log.PurposeOfVisit.toLowerCase().includes(term));
        let matchesType = true;
        if (filterType === 'risk') matchesType = (log.IsFlagged == 1 || log.visitor?.IsWatchlisted == 1 || log.visitor?.Status === 'Banned');
        else if (filterType === 'overstay') matchesType = getDurationHours(log.EntryTimestamp) > 4;
        return matchesSearch && matchesType;
    });

    const riskCount = visitors.filter(v => v.IsFlagged == 1 || v.visitor?.IsWatchlisted == 1 || v.visitor?.Status === 'Banned').length;
    const overstayCount = visitors.filter(v => getDurationHours(v.EntryTimestamp) > 4).length;

    const handleForceCheckout = async () => {
        if (!window.confirm(`Force exit ${selectedVisitor.visitor?.FullName}?`)) return;
        try {
            await axios.post(`${API_BASE}/api/admin/checkout`, { log_id: selectedVisitor.LogID });
            addActivity(`🚪 FORCED EXIT: ${selectedVisitor.visitor?.FullName}`, 'neutral');
            setSelectedVisitor(null); fetchData();
        } catch (error) { alert("Action Failed"); }
    };

    const handleGlobalClearance = async (targetLevel) => {
        const vid = selectedVisitor.visitor.VisitorID;
        try {
            await axios.post(`${API_BASE}/api/visitors/${vid}/global-status`, {
                status: targetLevel,
                reason: targetLevel === 'Cleared' ? 'Record Cleared' : actionReason
            });

            if (targetLevel === 'Cleared') addActivity(`🟢 RECORD CLEARED: ${selectedVisitor.visitor.FullName}`, 'success');
            else if (targetLevel === 'Watchlisted') addActivity(`⚠️ FLAGGED (GLOBAL): ${selectedVisitor.visitor.FullName} (${actionReason})`, 'warning');
            else if (targetLevel === 'Banned') addActivity(`🚫 BANNED: ${selectedVisitor.visitor.FullName} (${actionReason})`, 'danger');

            fetchData();
            const res = await axios.get(`${API_BASE}/api/visitors/${vid}`);
            setSelectedVisitor(prev => ({...prev, visitor: res.data}));
            setInputMode(null); setActionReason("");
        } catch (error) { alert("Action failed."); }
    };

    const formatDuration = (entryTime) => {
        const diff = Math.floor((currentTime - new Date(entryTime)) / 1000);
        const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60);
        let color = '#059669'; if (h >= 2) color = '#d97706'; if (h >= 4) color = '#dc2626'; 
        return <span style={{ color, fontWeight: 'bold', fontFamily: 'monospace' }}>{h}h {m}m</span>;
    };

    const getRowStyle = (log) => {
        const h = getDurationHours(log.EntryTimestamp);
        const isBanned = log.visitor?.Status === 'Banned';
        const isWatchlisted = log.visitor?.IsWatchlisted == 1 && !isBanned;
        const isAIFlag = log.IsFlagged == 1;

        if (isBanned) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #b91c1c', cursor: 'pointer' }; 
        if (isAIFlag) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (h > 4) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (isWatchlisted) return { backgroundColor: '#fef3c7', borderLeft: '6px solid #d97706', cursor: 'pointer' }; 
        return { backgroundColor: 'white', borderLeft: '6px solid transparent', cursor: 'pointer', transition: 'all 0.2s' };
    };

    const ChipButton = ({ label, count, active, type, onClick }) => {
        let baseColor = '#e5e7eb'; let activeColor = '#1f2937'; let textColor = '#374151'; let activeText = 'white';
        if (type === 'risk') { baseColor = '#fee2e2'; activeColor = '#dc2626'; textColor = '#b91c1c'; }
        if (type === 'overstay') { baseColor = '#ffedd5'; activeColor = '#ea580c'; textColor = '#9a3412'; }
        return (
            <button onClick={onClick} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginRight: '8px', backgroundColor: active ? activeColor : baseColor, color: active ? activeText : textColor }}>
                {label} {count > 0 && <span style={{ opacity: 0.8, fontSize: '0.9em', marginLeft: '4px' }}>({count})</span>}
            </button>
        );
    };

    // --- STYLES ---
    const pageGrid = { display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: '20px', height: '85vh' };
    const mainPanel = { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowY: 'auto' };
    const sidePanel = { backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', overflowY: 'auto' };
    const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textTransform:'uppercase' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', fontSize:'13px', boxSizing: 'border-box', marginTop:'5px', outline:'none' };
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' };
    const modalBoxStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };

    // Safety Fallback for Laravel relationships
    const secLogs = selectedVisitor ? (selectedVisitor.security_logs || selectedVisitor.securityLogs || []) : [];

    return (
        <div className="fade-in" style={pageGrid}>
            <div style={mainPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>👁️ Live Monitor</h2>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Real-time AI surveillance</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <input type="text" placeholder="🔍 Search active visitors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', width: '220px', outline: 'none' }} />
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: occupancy > capacity ? '#ef4444' : '#10b981' }}>{occupancy} <span style={{fontSize: '16px', color: '#9ca3af'}}>/ {capacity}</span></div>
                    </div>
                </div>

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
                            <tr><td colSpan="5" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>{searchTerm || filterType !== 'all' ? "No matching visitors found." : "Building is empty."}</td></tr>
                        ) : (
                            filteredVisitors.map(log => {
                                const rowStyle = getRowStyle(log);
                                const isBanned = log.visitor?.Status === 'Banned';
                                const isWatchlisted = log.visitor?.IsWatchlisted == 1 && !isBanned;
                                const isAIFlag = log.IsFlagged == 1;
                                const isOverstay = getDurationHours(log.EntryTimestamp) > 4;

                                return (
                                    <tr key={log.LogID} style={rowStyle} onClick={() => setSelectedVisitor(log)} className="hover-scale" title="Click to manage">
                                        <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>
                                            {isBanned && <span title="Banned User">🚫</span>}
                                            {!isBanned && isWatchlisted && <span title="Global Watchlist">⚠️</span>}
                                            {isAIFlag && <span title="AI Suspicion">🤖</span>}
                                            {!isBanned && !isWatchlisted && !isAIFlag && <div style={{width:'8px', height:'8px', background:'#10b981', borderRadius:'50%', margin:'0 auto', opacity:0.3}}></div>}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginRight: '12px' }}>
                                                    {log.visitor?.FullName ? log.visitor.FullName[0] : '?'}
                                                </div>
                                                <div>
                                                    <div style={{fontWeight: 'bold', color: '#111827'}}>{log.visitor?.FullName}</div>
                                                    <div style={{fontSize: '11px', color: '#6b7280'}}>{log.visitor?.VisitorType || 'Visitor'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={tdStyle}><span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e5e7eb', color: '#374151' }}>{log.DepartmentToVisit}</span></td>
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
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {activityFeed.map((alert) => {
                        let msgColor = 'white'; let borderColor = '#374151'; let bg = 'rgba(255,255,255,0.05)';
                        if (alert.type === 'danger') { msgColor = '#fca5a5'; borderColor = '#ef4444'; }
                        else if (alert.type === 'warning') { msgColor = '#fde047'; borderColor = '#eab308'; }
                        else if (alert.type === 'success') { msgColor = '#86efac'; borderColor = '#10b981'; }
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
                            <h2 style={{margin:0, fontSize:'18px'}}>👮‍♂️ Security Control</h2>
                            <button onClick={() => setSelectedVisitor(null)} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer'}}>✕</button>
                        </div>
                        
                        <div style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
                            <div style={{width:'60px', height:'60px', borderRadius:'8px', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'#9ca3af'}}>{selectedVisitor.visitor?.FullName[0]}</div>
                            <div>
                                <h3 style={{margin:0}}>{selectedVisitor.visitor?.FullName}</h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#6b7280'}}>ID: #{selectedVisitor.visitor?.VisitorID} • {selectedVisitor.visitor?.VisitorType || selectedVisitor.visitor?.AffiliationType}</p>
                            </div>
                        </div>

                        {/* 📇 FULL DETAILS GRID */}
                        <div style={{background:'#f9fafb', padding:'15px', borderRadius:'8px', marginBottom:'20px', fontSize:'13px'}}>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                <div style={{gridColumn: 'span 2', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '4px'}}>
                                    <strong style={{color: '#4f46e5'}}>Current Visit Info</strong>
                                </div>
                                <div><strong>Dept:</strong> {selectedVisitor.DepartmentToVisit}</div>
                                <div><strong>Host:</strong> {selectedVisitor.PersonToVisit || 'N/A'}</div>
                                <div style={{gridColumn: 'span 2'}}><strong>Purpose:</strong> {selectedVisitor.PurposeOfVisit}</div>
                                
                                <div style={{gridColumn: 'span 2', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '4px', marginTop: '4px'}}>
                                    <strong style={{color: '#4f46e5'}}>Personal Data</strong>
                                </div>
                                <div><strong>Age:</strong> {selectedVisitor.visitor?.Age || 'N/A'}</div>
                                <div><strong>Sex:</strong> {selectedVisitor.visitor?.Sex || 'N/A'}</div>
                                <div><strong>Phone:</strong> {selectedVisitor.visitor?.ContactNumber || 'N/A'}</div>
                                <div><strong>Email:</strong> {selectedVisitor.visitor?.Email || 'N/A'}</div>
                            </div>
                        </div>

                        {/* 🌍 RESPONSIVE GLOBAL CLEARANCE */}
                        <div>
                            <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                <h4 style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Global Status</h4>
                                <button onClick={handleForceCheckout} style={{ padding:'4px 10px', background:'white', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'11px' }}>🚪 Force Exit</button>
                            </div>
                            
                            {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                <div className="fade-in">
                                    <input type="text" autoFocus value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Reason for ${inputMode}...`} style={{...inputStyle, border: `1px solid ${inputMode === 'ban' ? '#ef4444' : '#d97706'}`}} />
                                    <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                        <button onClick={() => setInputMode(null)} style={{flex:1, padding:'8px', borderRadius:'6px', border:'none', cursor:'pointer'}}>Cancel</button>
                                        <button onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')} style={{flex:1, padding:'8px', borderRadius:'6px', border:'none', cursor:'pointer', background: inputMode === 'ban' ? '#ef4444' : '#d97706', color:'white', fontWeight:'bold'}}>Confirm</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                    {selectedVisitor.visitor?.Status === 'Banned' ? (
                                        <button onClick={() => handleGlobalClearance('Cleared')} style={{ gridColumn: 'span 2', padding:'10px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>✅ Unban User (Clear Record)</button>
                                    ) : selectedVisitor.visitor?.IsWatchlisted == 1 ? (
                                        <>
                                            <button onClick={() => handleGlobalClearance('Cleared')} style={{ padding:'10px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>✅ Remove Flag</button>
                                            <button onClick={() => setInputMode('ban')} style={{ padding:'10px', background:'#ef4444', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>🚫 Ban User</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setInputMode('watchlist')} style={{ padding:'10px', background:'#fefce8', color:'#a16207', border:'1px solid #fef08a', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>⚠️ Global Flag</button>
                                            <button onClick={() => setInputMode('ban')} style={{ padding:'10px', background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>🚫 Ban User</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}