import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Filter, AlertTriangle, Clock, Activity, DoorOpen, CheckCircle2, Ban, Flag, Bot, ShieldAlert } from 'lucide-react';

export default function LiveDashboard() {
    const [visitors, setVisitors] = useState([]);
    const [occupancy, setOccupancy] = useState(0);
    const [capacity] = useState(50); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); 
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Activity feed is now completely stateless and driven by the database!
    const [activityFeed, setActivityFeed] = useState([]);
    
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [inputMode, setInputMode] = useState(null); 
    const [actionReason, setActionReason] = useState(""); 

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!selectedVisitor) { setInputMode(null); setActionReason(""); }
    }, [selectedVisitor]);

    // --- UPDATED FETCH LOGIC (Stateless Database Sync) ---
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

        if (isBanned) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #b91c1c', cursor: 'pointer' }; 
        if (isAIFlag) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (h > 4) return { backgroundColor: '#fee2e2', borderLeft: '6px solid #ef4444', cursor: 'pointer' }; 
        if (isWatchlisted) return { backgroundColor: '#fef3c7', borderLeft: '6px solid #d97706', cursor: 'pointer' }; 
        return { backgroundColor: 'white', borderLeft: '6px solid transparent', cursor: 'pointer', transition: 'all 0.2s' };
    };

    // Remove emoji/pictographic characters from dynamic text (e.g. feed messages)
    const stripEmojis = (text) => {
        if (!text) return '';
        return text.replace(/[\p{Extended_Pictographic}\u2600-\u26FF\u2700-\u27BF]/gu, '');
    };

    const ChipButton = ({ label, count, active, type, onClick }) => {
        let baseClasses = 'px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all mr-2 border ';
        let activeClasses = '';
        let inactiveClasses = '';
        
        if (type === 'risk') {
            inactiveClasses = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
            activeClasses = 'bg-red-600 text-white border-red-600';
        } else if (type === 'overstay') {
            inactiveClasses = 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
            activeClasses = 'bg-orange-600 text-white border-orange-600';
        } else {
            inactiveClasses = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
            activeClasses = 'bg-slate-900 text-white border-slate-900';
        }
        
        return (
            <button 
                onClick={onClick} 
                className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
            >
                <span className="inline-flex items-center gap-1">
                    {!type && <Filter className="w-3 h-3" />}
                    {type === 'risk' && <AlertTriangle className="w-3 h-3" />}
                    {type === 'overstay' && <Clock className="w-3 h-3" />}
                    <span>{label}</span>
                    {count > 0 && <span className="opacity-80 text-[0.9em] ml-1">({count})</span>}
                </span>
            </button>
        );
    };

    // --- STYLES ---
    const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textTransform:'uppercase' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', fontSize:'13px', boxSizing: 'border-box', marginTop:'5px', outline:'none' };

    return (
        <div className="fade-in bg-slate-50 min-h-screen p-6">
            <div className="grid grid-cols-[3.5fr_1fr] gap-5 h-[85vh]">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-y-auto">
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 -mx-6 -mt-6 border-b border-slate-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                                    <span className="inline-flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-blue-600" />
                                        <span>Live Monitor</span>
                                    </span>
                                </h2>
                                <span className="text-sm text-slate-500">Real-time AI surveillance</span>
                            </div>
                            <div className="flex gap-5 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Search active visitors..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-56 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" 
                                />
                                <div className={`text-3xl font-bold ${occupancy > capacity ? 'text-red-600' : 'text-green-600'}`}>
                                    {occupancy} <span className="text-base font-normal text-slate-500">/ {capacity}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 flex items-center">
                        <span className="text-xs font-semibold text-slate-500 mr-3 uppercase tracking-wide">Filters:</span>
                        <ChipButton label="All Active" count={visitors.length} active={filterType === 'all'} onClick={() => setFilterType('all')} />
                        <ChipButton label="High Risk" count={riskCount} active={filterType === 'risk'} type="risk" onClick={() => setFilterType('risk')} />
                        <ChipButton label="Overstaying" count={overstayCount} active={filterType === 'overstay'} type="overstay" onClick={() => setFilterType('overstay')} />
                    </div>

                    <table style={tableStyle}>
                        <thead>
                            <tr className="bg-slate-50">
                                <th style={{...thStyle, width: '60px', textAlign: 'center'}} className="text-slate-600">Risk</th>
                                <th style={thStyle} className="text-slate-600">Visitor Details</th>
                                <th style={thStyle} className="text-slate-600">Department</th>
                                <th style={thStyle} className="text-slate-600">Timeline</th>
                                <th style={thStyle} className="text-slate-600">Purpose / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVisitors.length === 0 ? (
                                <tr><td colSpan="5" className="py-10 text-center text-slate-500">{searchTerm || filterType !== 'all' ? "No matching visitors found." : "Building is empty."}</td></tr>
                            ) : (
                                filteredVisitors.map(log => {
                                    const rowStyle = getRowStyle(log);
                                    const isBanned = log.visitor?.Status === 'Banned';
                                    const isWatchlisted = log.visitor?.IsWatchlisted == 1 && !isBanned;
                                    const isAIFlag = log.IsFlagged == 1;
                                    const isOverstay = getDurationHours(log.EntryTimestamp) > 4;

                                    return (
                                        <tr key={log.LogID} style={rowStyle} onClick={() => setSelectedVisitor(log)} className="hover-scale cursor-pointer transition-all" title="Click to manage">
                                            <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>
                                                {isBanned && <Ban title="Banned User" className="w-4 h-4 text-red-600 inline-block" />}
                                                {!isBanned && isWatchlisted && <Flag title="Global Watchlist" className="w-4 h-4 text-amber-600 inline-block" />}
                                                {isAIFlag && <Bot title="AI Suspicion" className="w-4 h-4 text-blue-600 inline-block" />}
                                                {!isBanned && !isWatchlisted && !isAIFlag && <div className="w-2 h-2 bg-green-600 rounded-full mx-auto opacity-30"></div>}
                                            </td>
                                            <td style={tdStyle}>
                                                <div className="flex items-center">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                                                        {log.visitor?.FullName ? log.visitor.FullName[0] : '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{log.visitor?.FullName}</div>
                                                        <div className="text-xs text-slate-500">{log.visitor?.VisitorType || 'Visitor'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">{log.DepartmentToVisit}</span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div className="flex flex-col">
                                                    {formatDuration(log.EntryTimestamp)}
                                                    <span className="text-xs text-slate-500 mt-0.5">In: {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700">{log.PurposeOfVisit}</span>
                                                    {isOverstay && (
                                                        <span className="text-xs text-red-600 font-bold mt-0.5 inline-flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Overstay alert</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col overflow-y-auto">
                    <div className="bg-slate-50 rounded-lg p-4 mb-5 -mx-6 -mt-6 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            <span className="inline-flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <span>Today's Feed</span>
                            </span>
                        </h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {activityFeed.map((alert) => {
                            let borderColor = 'border-slate-300';
                            let bgColor = 'bg-slate-50';
                            let textColor = 'text-slate-700';
                            
                            if (alert.type === 'danger') { 
                                borderColor = 'border-red-500'; 
                                bgColor = 'bg-red-50'; 
                                textColor = 'text-red-700';
                            }
                            else if (alert.type === 'warning') { 
                                borderColor = 'border-yellow-500'; 
                                bgColor = 'bg-yellow-50'; 
                                textColor = 'text-yellow-700';
                            }
                            else if (alert.type === 'success') { 
                                borderColor = 'border-green-500'; 
                                bgColor = 'bg-green-50'; 
                                textColor = 'text-green-700';
                            }
                            else if (alert.type === 'system') { 
                                borderColor = 'border-blue-600'; 
                                bgColor = 'bg-blue-50'; 
                                textColor = 'text-blue-700';
                            }

                            return (
                                <div key={alert.id} className={`fade-in p-3 border-l-4 ${borderColor} ${bgColor} rounded-r-md`}>
                                    <div className="text-xs text-slate-500 mb-1">{alert.time}</div>
                                    <div className={`text-sm ${textColor} font-medium`}>{stripEmojis(alert.msg)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedVisitor && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-[450px] shadow-xl border border-slate-200">
                        <div className="bg-slate-50 rounded-lg p-4 mb-5 -mx-6 -mt-6 border-b border-slate-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    <span className="inline-flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-blue-600" />
                                        <span>Security Control</span>
                                    </span>
                                </h2>
                                <button onClick={() => setSelectedVisitor(null)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mb-5">
                            <div className="w-15 h-15 rounded-lg bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500">{selectedVisitor.visitor?.FullName[0]}</div>
                            <div>
                                <h3 className="text-slate-900 font-semibold mb-1">{selectedVisitor.visitor?.FullName}</h3>
                                <p className="text-sm text-slate-500">ID: #{selectedVisitor.visitor?.VisitorID} • {selectedVisitor.visitor?.VisitorType || selectedVisitor.visitor?.AffiliationType}</p>
                            </div>
                        </div>

                        {/* FULL DETAILS GRID */}
                        <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm border border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 border-b border-slate-200 pb-2 mb-2">
                                    <strong className="text-blue-600">Current Visit Info</strong>
                                </div>
                                <div className="text-slate-700"><strong className="text-slate-900">Dept:</strong> {selectedVisitor.DepartmentToVisit}</div>
                                <div className="text-slate-700"><strong className="text-slate-900">Host:</strong> {selectedVisitor.PersonToVisit || 'N/A'}</div>
                                <div className="col-span-2 text-slate-700"><strong className="text-slate-900">Purpose:</strong> {selectedVisitor.PurposeOfVisit}</div>
                                
                                <div className="col-span-2 border-b border-slate-200 pb-2 mb-2 mt-2">
                                    <strong className="text-blue-600">Personal Data</strong>
                                </div>
                                <div className="text-slate-700"><strong className="text-slate-900">Age:</strong> {selectedVisitor.visitor?.Age || 'N/A'}</div>
                                <div className="text-slate-700"><strong className="text-slate-900">Sex:</strong> {selectedVisitor.visitor?.Sex || 'N/A'}</div>
                                <div className="text-slate-700"><strong className="text-slate-900">Phone:</strong> {selectedVisitor.visitor?.ContactNumber || 'N/A'}</div>
                                <div className="text-slate-700"><strong className="text-slate-900">Email:</strong> {selectedVisitor.visitor?.Email || 'N/A'}</div>
                            </div>
                        </div>

                        {/* RESPONSIVE GLOBAL CLEARANCE */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Global Status</h4>
                                <button onClick={handleForceCheckout} className="px-3 py-1.5 bg-white text-red-600 border border-red-300 rounded-md cursor-pointer font-semibold text-xs hover:bg-red-50 transition-colors">
                                    <span className="inline-flex items-center gap-2">
                                        <DoorOpen className="w-4 h-4" />
                                        <span>Force Exit</span>
                                    </span>
                                </button>
                            </div>
                            
                            {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                <div className="fade-in">
                                    <input 
                                        type="text" 
                                        autoFocus 
                                        value={actionReason} 
                                        onChange={(e) => setActionReason(e.target.value)} 
                                        placeholder={`Reason for ${inputMode}...`} 
                                        className={`w-full px-3 py-2 rounded-lg text-sm mt-2 outline-none border ${inputMode === 'ban' ? 'border-red-400 focus:ring-2 focus:ring-red-500' : 'border-orange-400 focus:ring-2 focus:ring-orange-500'}`}
                                    />
                                    <div className="flex gap-3 mt-3">
                                        <button onClick={() => setInputMode(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 cursor-pointer bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium">Cancel</button>
                                        <button onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')} className={`flex-1 px-4 py-2 rounded-lg border-none cursor-pointer text-white font-semibold transition-colors ${inputMode === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Confirm</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedVisitor.visitor?.Status === 'Banned' ? (
                                        <button onClick={() => handleGlobalClearance('Cleared')} className="col-span-2 px-4 py-2.5 bg-green-600 text-white border-none rounded-lg cursor-pointer font-semibold hover:bg-green-700 transition-colors">
                                            <span className="inline-flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Unban User (Clear Record)</span>
                                            </span>
                                        </button>
                                    ) : selectedVisitor.visitor?.IsWatchlisted == 1 ? (
                                        <>
                                            <button onClick={() => handleGlobalClearance('Cleared')} className="px-4 py-2.5 bg-green-600 text-white border-none rounded-lg cursor-pointer font-semibold hover:bg-green-700 transition-colors">
                                                <span className="inline-flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>Remove Flag</span>
                                                </span>
                                            </button>
                                            <button onClick={() => setInputMode('ban')} className="px-4 py-2.5 bg-red-600 text-white border-none rounded-lg cursor-pointer font-semibold hover:bg-red-700 transition-colors">
                                                <span className="inline-flex items-center gap-2">
                                                    <Ban className="w-4 h-4" />
                                                    <span>Ban User</span>
                                                </span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setInputMode('watchlist')} className="px-4 py-2.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg cursor-pointer font-semibold hover:bg-yellow-100 transition-colors">
                                                <span className="inline-flex items-center gap-2">
                                                    <Flag className="w-4 h-4" />
                                                    <span>Global Flag</span>
                                                </span>
                                            </button>
                                            <button onClick={() => setInputMode('ban')} className="px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg cursor-pointer font-semibold hover:bg-red-100 transition-colors">
                                                <span className="inline-flex items-center gap-2">
                                                    <Ban className="w-4 h-4" />
                                                    <span>Ban User</span>
                                                </span>
                                            </button>
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