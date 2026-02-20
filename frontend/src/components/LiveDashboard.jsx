import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); 
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // 🔥 Activity feed is now completely stateless and driven by the database!
    const [activityFeed, setActivityFeed] = useState([]);
    
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [inputMode, setInputMode] = useState(null); 
    const [actionReason, setActionReason] = useState(""); 

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!selectedVisitor) { setInputMode(null); setActionReason(""); }
    }, [selectedVisitor]);

    // --- 🛠️ UPDATED FETCH LOGIC (Stateless Database Sync) ---
    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/live-monitor`);
            if (response.data.success) {
                setVisitors(response.data.data);
                setOccupancy(response.data.occupancy);
                setActivityFeed(response.data.feed); // The backend provides the fully sorted log of today's events!
            }
        } catch (error) { console.error("Live Monitor Sync Error:", error); }
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
            setSelectedVisitor(null); 
            fetchData(); // Feed auto-updates from DB
        } catch (error) { alert("Action Failed"); }
    };

    const handleGlobalClearance = async (targetLevel) => {
        const vid = selectedVisitor.visitor.VisitorID;
        try {
            await axios.post(`${API_BASE}/api/visitors/${vid}/global-status`, {
                status: targetLevel,
                reason: targetLevel === 'Cleared' ? 'Record Cleared' : actionReason
            });

            fetchData(); // Feed auto-updates from DB
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

        if (isBanned) return { 
          backgroundColor: '#fef2f2', 
          borderLeft: '4px solid #dc2626', 
          cursor: 'pointer',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(220,38,38,0.1)',
          transition: 'all 0.3s ease'
        }; 
        if (isAIFlag) return { 
          backgroundColor: '#fef2f2', 
          borderLeft: '4px solid #f97316', 
          cursor: 'pointer',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(249,115,22,0.1)',
          transition: 'all 0.3s ease'
        }; 
        if (h > 4) return { 
          backgroundColor: '#fef3c7', 
          borderLeft: '4px solid #f97316', 
          cursor: 'pointer',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(249,115,22,0.1)',
          transition: 'all 0.3s ease'
        }; 
        if (isWatchlisted) return { 
          backgroundColor: '#fef9c3', 
          borderLeft: '4px solid #eab308', 
          cursor: 'pointer',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(234,179,8,0.1)',
          transition: 'all 0.3s ease'
        }; 
        return { 
          backgroundColor: 'white', 
          borderLeft: '4px solid #10b981', 
          cursor: 'pointer', 
          transition: 'all 0.3s ease',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        };
    };

    const ChipButton = ({ label, count, active, type, onClick }) => {
        let baseColor = '#f1f5f9'; let activeColor = '#2563eb'; let textColor = '#64748b'; let activeText = 'white';
        let baseBorder = '#cbd5e1'; let activeBorder = '#2563eb'; let borderColor = baseBorder;
        if (type === 'risk') { baseColor = '#fee2e2'; activeColor = '#dc2626'; textColor = '#7f1d1d'; activeBorder = '#dc2626'; baseBorder = '#fecaca'; }
        if (type === 'overstay') { baseColor = '#fef3c7'; activeColor = '#f97316'; textColor = '#92400e'; activeBorder = '#f97316'; baseBorder = '#fde68a'; }
        return (
            <button onClick={onClick} style={{ padding: '10px 18px', borderRadius: '12px', border: `1.5px solid ${active ? activeBorder : borderColor}`, fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', marginRight: '10px', backgroundColor: active ? activeColor : baseColor, color: active ? activeText : textColor, boxShadow: active ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.05)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {label} {count > 0 && <span style={{ marginLeft: '6px', opacity: 0.85, fontSize: '0.85em', fontWeight: '800' }}>({count})</span>}
            </button>
        );
    };

    // --- 2026 ENTERPRISE SECURITY COMMAND CENTER DESIGN SYSTEM ---
    const pageGrid = { display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: '24px', height: '85vh', padding: '0', margin: '0' };
    const mainPanel = { 
      backgroundColor: '#f8fafc', 
      borderRadius: '20px', 
      padding: '28px', 
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)', 
      overflowY: 'auto',
      border: '1px solid rgba(203,213,225,0.4)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    };
    const sidePanel = { 
      backgroundColor: '#0f172a', 
      borderRadius: '20px', 
      padding: '24px', 
      color: '#e2e8f0', 
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto',
      border: '1px solid rgba(30,41,59,0.6)',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), inset 0 1px 0 rgba(71,85,105,0.1)',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    };
    const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', fontSize: '14px' };
    const thStyle = { 
      textAlign: 'left', 
      padding: '14px 16px', 
      borderBottom: '2px solid #cbd5e1', 
      color: '#475569', 
      fontSize: '11px', 
      textTransform:'uppercase',
      fontWeight: '700',
      letterSpacing: '0.5px'
    };
    const tdStyle = { padding: '14px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' };
    const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize:'13px', boxSizing: 'border-box', marginTop:'8px', outline:'none', border: '1.5px solid #cbd5e1', backgroundColor: 'white', color: '#0f172a', transition: 'all 0.3s ease' };
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(12px)' };
    const modalBoxStyle = { backgroundColor: 'white', padding: '32px', borderRadius: '20px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(203,213,225,0.2)', border: '1px solid #e2e8f0' };

    return (
        <div className="fade-in" style={pageGrid}>
            <div style={mainPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #cbd5e1' }}>
                    <div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>🎯 Live Monitor</h2>
                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Real-time AI facial recognition & occupancy tracking</span>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <input type="text" placeholder="Search visitors by name, dept, purpose..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '11px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '13px', width: '280px', outline: 'none', backgroundColor: 'white', color: '#0f172a', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} onFocus={(e) => e.target.style.borderColor = '#2563eb'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: occupancy > capacity ? '#dc2626' : '#059669', letterSpacing: '-1px' }}>{occupancy}</div>
                            <div style={{fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px'}}>CAPACITY {occupancy > capacity ? '⚠️ EXCEEDED' : '✓ SAFE'} • {capacity} max</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Filter:</span>
                    <ChipButton label="All Active" count={visitors.length} active={filterType === 'all'} onClick={() => setFilterType('all')} />
                    <ChipButton label="🚨 High Risk" count={riskCount} active={filterType === 'risk'} type="risk" onClick={() => setFilterType('risk')} />
                    <ChipButton label="⏱️ Overstaying" count={overstayCount} active={filterType === 'overstay'} type="overstay" onClick={() => setFilterType('overstay')} />
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
                            <tr><td colSpan="5" style={{padding: '60px 40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: '500'}}>{searchTerm || filterType !== 'all' ? "🔍 No matching visitors found." : "✓ Building is empty"}</td></tr>
                        ) : (
                            filteredVisitors.map(log => {
                                const rowStyle = getRowStyle(log);
                                const isBanned = log.visitor?.Status === 'Banned';
                                const isWatchlisted = log.visitor?.IsWatchlisted == 1 && !isBanned;
                                const isAIFlag = log.IsFlagged == 1;
                                const isOverstay = getDurationHours(log.EntryTimestamp) > 4;

                                return (
                                    <tr key={log.LogID} style={rowStyle} onClick={() => setSelectedVisitor(log)} className="hover-scale" title="Click to view & manage" onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = rowStyle.boxShadow}>
                                        <td style={{...tdStyle, textAlign: 'center', fontSize: '20px', fontWeight: 'bold'}}>
                                            {isBanned && <span title="Banned User" style={{filter: 'drop-shadow(0 2px 4px rgba(220,38,38,0.3))'}}>🚫</span>}
                                            {!isBanned && isWatchlisted && <span title="Global Watchlist" style={{filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.3))'}}>⚠️</span>}
                                            {isAIFlag && <span title="AI Suspicion" style={{filter: 'drop-shadow(0 2px 4px rgba(249,115,22,0.3))'}}>🤖</span>}
                                            {!isBanned && !isWatchlisted && !isAIFlag && <div style={{width:'10px', height:'10px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius:'50%', margin:'0 auto', boxShadow: '0 0 8px rgba(16,185,129,0.4)'}}></div>}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: 'white', marginRight: '12px', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
                                                    {log.visitor?.FullName ? log.visitor.FullName[0].toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <div style={{fontWeight: '700', color: '#0f172a', fontSize: '13px'}}>{log.visitor?.FullName}</div>
                                                    <div style={{fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px'}}>{log.visitor?.VisitorType || 'Visitor'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={tdStyle}><span style={{ fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{log.DepartmentToVisit}</span></td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', flexDirection:'column', gap: '4px'}}>
                                                {formatDuration(log.EntryTimestamp)}
                                                <span style={{fontSize:'10px', color:'#64748b', fontWeight: '600'}}>↓ {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', flexDirection:'column', gap: '4px'}}>
                                                <span style={{color: '#0f172a', fontWeight: '600'}}>{log.PurposeOfVisit}</span>
                                                {isOverstay && <span style={{fontSize:'11px', color:'#dc2626', fontWeight:'700', padding: '3px 8px', backgroundColor: '#fee2e2', borderRadius: '6px', display: 'inline-block', width: 'fit-content'}}>⏱️ OVERSTAY</span>}
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
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: '1px solid rgba(71,85,105,0.3)', paddingBottom: '14px', marginBottom: '20px'}}>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '800', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Today's Feed</h3>
                    <span style={{fontSize: '10px', color: '#94a3b8', fontWeight: '600'}}>LIVE</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {activityFeed.length === 0 ? (
                        <div style={{padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: '500'}}>No activity yet</div>
                    ) : (
                        activityFeed.map((alert) => {
                            let msgColor = '#e2e8f0'; let borderColor = '#475569'; let bg = 'rgba(148,163,184,0.05)'; let icon = '📝';
                            if (alert.type === 'danger') { msgColor = '#fca5a5'; borderColor = '#dc2626'; bg = 'rgba(220,38,38,0.1)'; icon = '🚨'; }
                            else if (alert.type === 'warning') { msgColor = '#fbbf24'; borderColor = '#f97316'; bg = 'rgba(249,115,22,0.1)'; icon = '⚠️'; }
                            else if (alert.type === 'success') { msgColor = '#86efac'; borderColor = '#10b981'; bg = 'rgba(16,185,129,0.1)'; icon = '✅'; }
                            else if (alert.type === 'system') { msgColor = '#93c5fd'; borderColor = '#3b82f6'; bg = 'rgba(59,130,246,0.1)'; icon = '⚙️'; }

                            return (
                                <div key={alert.id} className="fade-in" style={{ padding: '12px 14px', borderLeft: `3px solid ${borderColor}`, backgroundColor: bg, borderRadius: '10px', transition: 'all 0.3s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom:'4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{icon} {alert.time}</div>
                                    <div style={{ fontSize: '12px', color: msgColor, fontWeight: '600', lineHeight: '1.4' }}>{alert.msg}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedVisitor && (
                <div style={modalOverlayStyle}>
                    <div style={modalBoxStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', borderBottom:'2px solid #e2e8f0', paddingBottom:'16px'}}>
                            <h2 style={{margin:'0', fontSize:'20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.3px'}}>🔐 Security Control Panel</h2>
                            <button onClick={() => setSelectedVisitor(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', color: '#64748b', transition: 'color 0.2s'}} onMouseEnter={(e) => e.target.style.color = '#dc2626'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>✕</button>
                        </div>
                        
                        <div style={{display:'flex', gap:'16px', marginBottom:'24px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1'}}>
                            <div style={{width:'64px', height:'64px', borderRadius:'12px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'800', color:'white', boxShadow: '0 4px 12px rgba(37,99,235,0.2)', flexShrink: 0}}>{selectedVisitor.visitor?.FullName ? selectedVisitor.visitor?.FullName[0].toUpperCase() : '?'}</div>
                            <div>
                                <h3 style={{margin:'0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a'}}>{selectedVisitor.visitor?.FullName}</h3>
                                <p style={{margin:'0', fontSize:'12px', color:'#64748b', fontWeight: '600'}}>ID: #{selectedVisitor.visitor?.VisitorID} • {selectedVisitor.visitor?.VisitorType || selectedVisitor.visitor?.AffiliationType}</p>
                                <p style={{margin:'6px 0 0 0', fontSize:'11px', color: '#94a3b8', fontWeight: '500'}}>{new Date().toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})}</p>
                            </div>
                        </div>

                        {/* 📇 FULL DETAILS GRID */}
                        <div style={{background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding:'18px', borderRadius:'12px', marginBottom:'24px', fontSize:'12px', border: '1px solid #cbd5e1'}}>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                                <div style={{gridColumn: 'span 2', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '4px'}}>
                                    <strong style={{color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '11px', fontWeight: '800'}}>📍 Current Visit Info</strong>
                                </div>
                                <div><strong style={{color: '#475569'}}>Department:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.DepartmentToVisit}</span></div>
                                <div><strong style={{color: '#475569'}}>Host:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.PersonToVisit || 'N/A'}</span></div>
                                <div style={{gridColumn: 'span 2'}}><strong style={{color: '#475569'}}>Purpose:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.PurposeOfVisit}</span></div>
                                
                                <div style={{gridColumn: 'span 2', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '4px', marginTop: '8px'}}>
                                    <strong style={{color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '11px', fontWeight: '800'}}>👤 Personal Data</strong>
                                </div>
                                <div><strong style={{color: '#475569'}}>Age:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.visitor?.Age || 'N/A'}</span></div>
                                <div><strong style={{color: '#475569'}}>Sex:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.visitor?.Sex || 'N/A'}</span></div>
                                <div><strong style={{color: '#475569'}}>Phone:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.visitor?.ContactNumber || 'N/A'}</span></div>
                                <div><strong style={{color: '#475569'}}>Email:</strong> <span style={{color: '#0f172a', fontWeight: '600'}}>{selectedVisitor.visitor?.Email || 'N/A'}</span></div>
                            </div>
                        </div>

                        {/* 🌍 RESPONSIVE GLOBAL CLEARANCE */}
                        <div style={{marginTop: '28px', paddingTop: '20px', borderTop: '2px solid #e2e8f0'}}>
                            <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                <h4 style={{ margin: '0', fontSize: '12px', color: '#475569', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>🔄 Global Status Control</h4>
                                <button onClick={handleForceCheckout} style={{ padding:'8px 14px', background: '#fef2f2', color:'#dc2626', border:'1.5px solid #fecaca', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'11px', transition: 'all 0.3s ease', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 2px 6px rgba(220,38,38,0.1)' }} onMouseEnter={(e) => {e.target.style.backgroundColor = '#dc2626'; e.target.style.color = 'white'}} onMouseLeave={(e) => {e.target.style.backgroundColor = '#fef2f2'; e.target.style.color = '#dc2626'}}>🚪 Force Exit</button>
                            </div>
                            
                            {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                <div className="fade-in" style={{animation: 'fadeIn 0.2s ease'}}>
                                    <input type="text" autoFocus value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Enter reason for ${inputMode === 'ban' ? 'ban' : 'flag'}...`} style={{...inputStyle, border: `1.5px solid ${inputMode === 'ban' ? '#dc2626' : '#f97316'}`, backgroundColor: inputMode === 'ban' ? '#fef2f2' : '#fef3c7'}} />
                                    <div style={{display:'flex', gap:'12px', marginTop:'14px'}}>
                                        <button onClick={() => setInputMode(null)} style={{flex:1, padding:'11px', borderRadius:'10px', border:'1.5px solid #cbd5e1', cursor:'pointer', fontWeight:'700', fontSize:'12px', backgroundColor: 'white', color: '#475569', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.3px'}} onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>Cancel</button>
                                        <button onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')} style={{flex:1, padding:'11px', borderRadius:'10px', border:'none', cursor:'pointer', background: inputMode === 'ban' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #f97316, #ea580c)', color:'white', fontWeight:'800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: `0 4px 12px ${inputMode === 'ban' ? 'rgba(220,38,38,0.3)' : 'rgba(249,115,22,0.3)'}`, transition: 'all 0.2s'}} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}>Confirm {inputMode === 'ban' ? '🚫' : '⚠️'}</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                    {selectedVisitor.visitor?.Status === 'Banned' ? (
                                        <button onClick={() => handleGlobalClearance('Cleared')} style={{ gridColumn: 'span 2', padding:'14px', background: 'linear-gradient(135deg, #059669, #047857)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}}>✅ UNBAN USER & CLEAR RECORD</button>
                                    ) : selectedVisitor.visitor?.IsWatchlisted == 1 ? (
                                        <>
                                            <button onClick={() => handleGlobalClearance('Cleared')} style={{ padding:'14px', background: 'linear-gradient(135deg, #059669, #047857)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}}>✅ Remove Flag</button>
                                            <button onClick={() => setInputMode('ban')} style={{ padding:'14px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 4px 12px rgba(220,38,38,0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}}>🚫 Ban User</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setInputMode('watchlist')} style={{ padding:'14px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color:'#78350f', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 4px 12px rgba(251,191,36,0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}}>⚠️ Flag Globally</button>
                                            <button onClick={() => setInputMode('ban')} style={{ padding:'14px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', boxShadow: '0 4px 12px rgba(220,38,38,0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.target.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.transform = 'translateY(0)'}}>🚫 Ban User</button>
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
