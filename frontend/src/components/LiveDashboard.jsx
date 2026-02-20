import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Filter, AlertTriangle, Clock, Activity, DoorOpen, CheckCircle2, Ban, Flag, Bot, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ── Helpers ────────────────────────────────────────────────────────────────

const stripEmojis = (text) => {
    if (!text) return '';
    return text.replace(/[\p{Extended_Pictographic}\u2600-\u26FF\u2700-\u27BF]/gu, '');
};

const FEED_STYLES = {
    danger:  { border: '#ef4444', bg: '#fff5f5', text: '#b91c1c', dot: '#ef4444' },
    warning: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
    success: { border: '#10b981', bg: '#f0fdf4', text: '#065f46', dot: '#10b981' },
    system:  { border: '#6366f1', bg: '#eef2ff', text: '#3730a3', dot: '#6366f1' },
    default: { border: '#cbd5e1', bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
    admin:   { border: '#64748b', bg: '#f1f5f9', text: '#334155', dot: '#475569' },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatPill({ label, value, variant = 'neutral' }) {
    const colors = {
        neutral: { bg: '#f1f5f9', text: '#475569', val: '#0f172a' },
        green:   { bg: '#f0fdf4', text: '#16a34a', val: '#15803d' },
        red:     { bg: '#fff5f5', text: '#dc2626', val: '#b91c1c' },
        amber:   { bg: '#fffbeb', text: '#d97706', val: '#b45309' },
    };
    const c = colors[variant];
    return (
        <div style={{ background: c.bg, borderRadius: 10, padding: '10px 16px', minWidth: 90, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.val, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: c.text, marginTop: 2, letterSpacing: '0.03em' }}>{label}</div>
        </div>
    );
}

function FilterChip({ label, count, active, variant, icon: Icon, onClick }) {
    const variants = {
        default: { idle: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }, active: { bg: '#0f172a', color: '#fff', border: '#0f172a' } },
        risk:    { idle: { bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' }, active: { bg: '#dc2626', color: '#fff', border: '#dc2626' } },
        amber:   { idle: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' }, active: { bg: '#d97706', color: '#fff', border: '#d97706' } },
    };
    const s = (variants[variant] || variants.default)[active ? 'active' : 'idle'];
    return (
        <button onClick={onClick} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
        }}>
            {Icon && <Icon size={12} />}
            {label}
            {count > 0 && <span style={{ opacity: 0.75, fontSize: 11 }}>({count})</span>}
        </button>
    );
}

function RiskBadge({ isBanned, isWatchlisted, isAIFlag }) {
    if (isBanned)      return <span title="Banned" style={badgeStyle('#b91c1c', '#fff5f5')}><Ban size={11} /> Banned</span>;
    if (isAIFlag)      return <span title="AI Flag" style={badgeStyle('#6366f1', '#eef2ff')}><Bot size={11} /> AI Flag</span>;
    if (isWatchlisted) return <span title="Watchlisted" style={badgeStyle('#d97706', '#fffbeb')}><Flag size={11} /> Watch</span>;
    return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981', opacity: 0.6 }} />;
}

const badgeStyle = (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, color, background: bg,
    padding: '3px 8px', borderRadius: 20,
    whiteSpace: 'nowrap'
});

function Avatar({ name, size = 36 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: size / 2.5,
            background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: 700, color: '#4338ca', flexShrink: 0,
        }}>
            {name?.[0] ?? '?'}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function LiveDashboard() {
    const [visitors, setVisitors]         = useState([]);
    const [occupancy, setOccupancy]       = useState(0);
    const [capacity]                      = useState(50);
    const [searchTerm, setSearchTerm]     = useState('');
    const [filterType, setFilterType]     = useState('all');
    const [currentTime, setCurrentTime]   = useState(new Date());
    const [activityFeed, setActivityFeed] = useState([]);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [inputMode, setInputMode]       = useState(null);
    const [actionReason, setActionReason] = useState('');

    useEffect(() => {
        if (!selectedVisitor) { setInputMode(null); setActionReason(''); }
    }, [selectedVisitor]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/live-monitor`);
            if (res.data.success) {
                setVisitors(res.data.data);
                setOccupancy(res.data.occupancy);
                setActivityFeed(res.data.feed);
            }
        } catch (e) { console.error('Live Monitor Sync Error:', e); }
    };

    useEffect(() => { fetchData(); const t = setInterval(fetchData, 3000); return () => clearInterval(t); }, []);
    useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

    const getDurationHours = (entryTime) => (currentTime - new Date(entryTime)) / 36e5;

    const filteredVisitors = visitors.filter(log => {
        const term = searchTerm.toLowerCase();
        const matchSearch = !term || (
            log.visitor?.FullName.toLowerCase().includes(term) ||
            log.DepartmentToVisit.toLowerCase().includes(term) ||
            log.PurposeOfVisit.toLowerCase().includes(term)
        );
        let matchFilter = true;
        if (filterType === 'risk') matchFilter = (log.IsFlagged == 1 || log.visitor?.IsWatchlisted == 1 || log.visitor?.Status === 'Banned');
        else if (filterType === 'overstay') matchFilter = getDurationHours(log.EntryTimestamp) > 4;
        return matchSearch && matchFilter;
    });

    const riskCount    = visitors.filter(v => v.IsFlagged == 1 || v.visitor?.IsWatchlisted == 1 || v.visitor?.Status === 'Banned').length;
    const overstayCount = visitors.filter(v => getDurationHours(v.EntryTimestamp) > 4).length;

    const formatDuration = (entryTime) => {
        const diff = Math.floor((currentTime - new Date(entryTime)) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const color = h >= 4 ? '#dc2626' : h >= 2 ? '#d97706' : '#059669';
        return (
            <span style={{ color, fontWeight: 700, fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
                {h}h {m}m
            </span>
        );
    };

    const getRowRisk = (log) => {
        const h = getDurationHours(log.EntryTimestamp);
        if (log.visitor?.Status === 'Banned' || log.IsFlagged == 1 || h > 4) return 'danger';
        if (log.visitor?.IsWatchlisted == 1) return 'warn';
        return 'ok';
    };

    const ROW_RISK_STYLES = {
        danger: { background: '#fff5f5', borderLeft: '3px solid #ef4444' },
        warn:   { background: '#fffbeb', borderLeft: '3px solid #f59e0b' },
        ok:     { background: '#ffffff', borderLeft: '3px solid transparent' },
    };

    const handleForceCheckout = async () => {
        if (!window.confirm(`Force exit ${selectedVisitor.visitor?.FullName}?`)) return;
        try {
            await axios.post(`${API_BASE}/api/admin/checkout`, { log_id: selectedVisitor.LogID });
            setSelectedVisitor(null);
            fetchData();
        } catch { alert('Action Failed'); }
    };

    const handleGlobalClearance = async (targetLevel) => {
        const vid = selectedVisitor.visitor.VisitorID;
        try {
            await axios.post(`${API_BASE}/api/visitors/${vid}/global-status`, {
                status: targetLevel,
                reason: targetLevel === 'Cleared' ? 'Record Cleared' : actionReason,
            });
            fetchData();
            const res = await axios.get(`${API_BASE}/api/visitors/${vid}`);
            setSelectedVisitor(prev => ({ ...prev, visitor: res.data }));
            setInputMode(null); setActionReason('');
        } catch { alert('Action failed.'); }
    };

    const occupancyPct = Math.min((occupancy / capacity) * 100, 100);
    const isOverCapacity = occupancy > capacity;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
                .ld-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
                .ld-row:hover { filter: brightness(0.97); }
                .ld-btn-icon { display: inline-flex; align-items: center; gap: 6px; }
                @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
                .ld-fade { animation: fadeUp 0.2s ease; }
            `}</style>

            <div className="ld-root" style={{ minHeight: '100vh', color: '#0f172a' }}>

                {/* ── PAGE HEADER ─────────────────────────────── */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Eye size={20} color="#6366f1" />
                                Live Monitoring
                            </h1>
                            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                                Real-time visitor surveillance · auto-refreshes every 3s
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <StatPill label="Inside Now" value={occupancy} variant={isOverCapacity ? 'red' : 'green'} />
                            <StatPill label="Capacity" value={capacity} variant="neutral" />
                            <StatPill label="At Risk" value={riskCount} variant={riskCount > 0 ? 'red' : 'neutral'} />
                            <StatPill label="Overstaying" value={overstayCount} variant={overstayCount > 0 ? 'amber' : 'neutral'} />
                        </div>
                    </div>

                    {/* Occupancy bar */}
                    <div style={{ marginTop: 14, background: '#f1f5f9', borderRadius: 6, height: 5, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${occupancyPct}%`,
                            background: isOverCapacity ? '#dc2626' : occupancyPct > 75 ? '#f59e0b' : '#6366f1',
                            borderRadius: 6, transition: 'width 0.6s ease',
                        }} />
                    </div>
                </div>

                {/* ── BODY GRID ────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, height: 'calc(100vh - 200px)' }}>

                    {/* ── LEFT: VISITOR TABLE ─────────────────── */}
                    <div style={{
                        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {/* Table toolbar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search visitors, department, purpose..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '8px 13px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    fontSize: 13, outline: 'none', width: 260, color: '#0f172a',
                                    fontFamily: 'inherit', background: '#f8fafc',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                <FilterChip label="All Active" count={visitors.length} active={filterType === 'all'} icon={Filter} onClick={() => setFilterType('all')} />
                                <FilterChip label="High Risk" count={riskCount} active={filterType === 'risk'} variant="risk" icon={AlertTriangle} onClick={() => setFilterType('risk')} />
                                <FilterChip label="Overstaying" count={overstayCount} active={filterType === 'overstay'} variant="amber" icon={Clock} onClick={() => setFilterType('overstay')} />
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                                        {['Status', 'Visitor', 'Department', 'Duration', 'Purpose'].map(h => (
                                            <th key={h} style={{
                                                textAlign: h === 'Status' ? 'center' : 'left', // Centered Status Header
                                                padding: '10px 16px',
                                                fontSize: 11, fontWeight: 600, color: '#94a3b8',
                                                letterSpacing: '0.07em', textTransform: 'uppercase',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisitors.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                                {searchTerm || filterType !== 'all' ? 'No matching visitors found.' : 'The building is currently empty.'}
                                            </td>
                                        </tr>
                                    ) : filteredVisitors.map(log => {
                                        const isBanned     = log.visitor?.Status === 'Banned';
                                        const isWatchlisted = log.visitor?.IsWatchlisted == 1 && !isBanned;
                                        const isAIFlag     = log.IsFlagged == 1;
                                        const isOverstay   = getDurationHours(log.EntryTimestamp) > 4;
                                        const risk         = getRowRisk(log);

                                        return (
                                            <tr
                                                key={log.LogID}
                                                className="ld-row"
                                                onClick={() => setSelectedVisitor(log)}
                                                style={{ cursor: 'pointer', ...ROW_RISK_STYLES[risk], transition: 'filter 0.1s' }}
                                            >
                                                {/* Centered Status Cell */}
                                                <td style={{ padding: '12px 16px', width: 110, textAlign: 'center' }}>
                                                    <RiskBadge isBanned={isBanned} isWatchlisted={isWatchlisted} isAIFlag={isAIFlag} />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <Avatar name={log.visitor?.FullName} />
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{log.visitor?.FullName}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{log.visitor?.VisitorType || 'Visitor'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 600, padding: '3px 9px',
                                                        borderRadius: 20, background: '#f1f5f9', color: '#475569',
                                                    }}>
                                                        {log.DepartmentToVisit}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {formatDuration(log.EntryTimestamp)}
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                                        In: {new Date(log.EntryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ color: '#334155' }}>{log.PurposeOfVisit}</span>
                                                    {isOverstay && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                                                            <Clock size={11} /> Overstay alert
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── RIGHT: ACTIVITY FEED ────────────────── */}
                    <div style={{
                        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={15} color="#6366f1" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Today's Activity</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>Live</span>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 0 2px #d1fae5' }} />
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {activityFeed.map(alert => {
                                const s = FEED_STYLES[alert.type] || FEED_STYLES.default;
                                return (
                                    <div key={alert.id} className="ld-fade" style={{
                                        borderLeft: `3px solid ${s.border}`,
                                        background: s.bg,
                                        borderRadius: '0 8px 8px 0',
                                        padding: '9px 12px',
                                    }}>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, fontFamily: 'DM Mono, monospace' }}>{alert.time}</div>
                                        <div style={{ fontSize: 12.5, color: s.text, fontWeight: 500, lineHeight: 1.4 }}>{stripEmojis(alert.msg)}</div>
                                    </div>
                                );
                            })}
                            {activityFeed.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 13, paddingTop: 32 }}>No activity yet today.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODAL ─────────────────────────────────────── */}
            {selectedVisitor && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)',
                }}>
                    <div className="ld-fade" style={{
                        background: '#fff', borderRadius: 16, width: 460,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden',
                    }}>
                        {/* Modal header */}
                        <div style={{
                            padding: '16px 22px', borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#f8fafc',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                <ShieldAlert size={17} color="#6366f1" /> Security Control
                            </span>
                            <button onClick={() => setSelectedVisitor(null)} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 20, color: '#94a3b8', lineHeight: 1,
                            }}>&times;</button>
                        </div>

                        <div style={{ padding: 22 }}>
                            {/* Visitor identity */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'center' }}>
                                <Avatar name={selectedVisitor.visitor?.FullName} size={46} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{selectedVisitor.visitor?.FullName}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                        ID #{selectedVisitor.visitor?.VisitorID} · {selectedVisitor.visitor?.VisitorType || selectedVisitor.visitor?.AffiliationType}
                                    </div>
                                </div>
                            </div>

                            {/* Details grid */}
                            <div style={{
                                background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
                                padding: '14px 16px', marginBottom: 18, fontSize: 13,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Visit Info</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 14px' }}>
                                    {[
                                        ['Department', selectedVisitor.DepartmentToVisit],
                                        ['Host', selectedVisitor.PersonToVisit || 'N/A'],
                                        ['Purpose', selectedVisitor.PurposeOfVisit, true],
                                    ].map(([label, val, full]) => (
                                        <div key={label} style={{ gridColumn: full ? '1/-1' : undefined }}>
                                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}: </span>
                                            <span style={{ color: '#334155', fontWeight: 500 }}>{val}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '12px 0 10px' }}>Personal Data</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 14px' }}>
                                    {[
                                        ['Age', selectedVisitor.visitor?.Age || 'N/A'],
                                        ['Sex', selectedVisitor.visitor?.Sex || 'N/A'],
                                        ['Phone', selectedVisitor.visitor?.ContactNumber || 'N/A'],
                                        ['Email', selectedVisitor.visitor?.Email || 'N/A'],
                                    ].map(([label, val]) => (
                                        <div key={label}>
                                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}: </span>
                                            <span style={{ color: '#334155', fontWeight: 500 }}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Global Status</span>
                                <button onClick={handleForceCheckout} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', background: '#fff', border: '1px solid #fca5a5',
                                    borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                                }}>
                                    <DoorOpen size={14} /> Force Exit
                                </button>
                            </div>

                            {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                <div className="ld-fade">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={actionReason}
                                        onChange={e => setActionReason(e.target.value)}
                                        placeholder={`Reason for ${inputMode}...`}
                                        style={{
                                            width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                                            border: `1.5px solid ${inputMode === 'ban' ? '#f87171' : '#fbbf24'}`,
                                            outline: 'none', fontFamily: 'inherit', color: '#0f172a', background: '#fff',
                                        }}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                                        <button onClick={() => setInputMode(null)} style={ghostBtn}>Cancel</button>
                                        <button
                                            onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')}
                                            style={{ ...solidBtn, background: inputMode === 'ban' ? '#dc2626' : '#d97706' }}
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {selectedVisitor.visitor?.Status === 'Banned' ? (
                                        <button onClick={() => handleGlobalClearance('Cleared')} style={{ ...solidBtn, background: '#10b981', gridColumn: '1/-1' }}>
                                            <span className="ld-btn-icon"><CheckCircle2 size={14} /> Unban User (Clear Record)</span>
                                        </button>
                                    ) : selectedVisitor.visitor?.IsWatchlisted == 1 ? (
                                        <>
                                            <button onClick={() => handleGlobalClearance('Cleared')} style={{ ...solidBtn, background: '#10b981' }}>
                                                <span className="ld-btn-icon"><CheckCircle2 size={14} /> Remove Flag</span>
                                            </button>
                                            <button onClick={() => setInputMode('ban')} style={{ ...solidBtn, background: '#dc2626' }}>
                                                <span className="ld-btn-icon"><Ban size={14} /> Ban User</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setInputMode('watchlist')} style={{ ...outlineBtn, color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }}>
                                                <span className="ld-btn-icon"><Flag size={14} /> Global Flag</span>
                                            </button>
                                            <button onClick={() => setInputMode('ban')} style={{ ...outlineBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fff5f5' }}>
                                                <span className="ld-btn-icon"><Ban size={14} /> Ban User</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Shared button styles ───────────────────────────────────────────────────

const baseBtn = {
    padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'opacity 0.15s',
};

const solidBtn   = { ...baseBtn, color: '#fff' };
const ghostBtn   = { ...baseBtn, background: '#fff', border: '1px solid #e2e8f0', color: '#475569' };
const outlineBtn = { ...baseBtn, border: '1px solid' };