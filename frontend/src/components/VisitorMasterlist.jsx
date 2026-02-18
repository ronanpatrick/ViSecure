import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- SIMPLE ICONS ---
const IconBan = () => <span style={{ fontSize: '16px' }}>🚫</span>;
const IconFlag = () => <span style={{ fontSize: '16px' }}>⚠️</span>;
const IconEye = () => <span style={{ fontSize: '16px' }}>👁️</span>;

export default function VisitorMasterList() {
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // 🔍 SEARCH & FILTER STATES
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'All',        
        affiliation: 'All',   
        regStart: '',   
        regEnd: '',
        visitStart: '', 
        visitEnd: ''
    });

    // MODAL STATE
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // 1. Fetch Data
    useEffect(() => {
        fetchVisitors();
    }, []);

    // 2. 🧠 ADVANCED FILTER LOGIC
    useEffect(() => {
        let results = visitors;

        // A. Text Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            results = results.filter(v => 
                v.FullName.toLowerCase().includes(lowerTerm) ||
                (v.AffiliationType && v.AffiliationType.toLowerCase().includes(lowerTerm)) ||
                v.VisitorID.toString().includes(lowerTerm)
            );
        }

        // B. Status Filter
        if (filters.status !== 'All') {
            if (filters.status === 'Watchlisted') {
                results = results.filter(v => Boolean(v.IsWatchlisted));
            } else if (filters.status === 'Banned') {
                results = results.filter(v => v.Status === 'Banned');
            } else if (filters.status === 'Active') {
                results = results.filter(v => v.Status === 'Active' && !v.IsWatchlisted);
            }
        }

        // C. Affiliation Filter
        if (filters.affiliation !== 'All') {
            results = results.filter(v => v.AffiliationType === filters.affiliation);
        }

        // D. 📅 REGISTRATION DATE FILTER
        if (filters.regStart) {
            results = results.filter(v => new Date(v.created_at) >= new Date(filters.regStart));
        }
        if (filters.regEnd) {
            const endDate = new Date(filters.regEnd);
            endDate.setHours(23, 59, 59);
            results = results.filter(v => new Date(v.created_at) <= endDate);
        }

        // E. 👣 VISIT DATE FILTER (Logs)
        if (filters.visitStart || filters.visitEnd) {
            results = results.filter(v => {
                if (!v.logs || v.logs.length === 0) return false;
                return v.logs.some(log => {
                    const logTime = new Date(log.EntryTimestamp);
                    const start = filters.visitStart ? new Date(filters.visitStart) : new Date('1970-01-01');
                    let end = filters.visitEnd ? new Date(filters.visitEnd) : new Date('2100-01-01');
                    if (filters.visitEnd) end.setHours(23, 59, 59);
                    return logTime >= start && logTime <= end;
                });
            });
        }

        setFilteredVisitors(results);
    }, [searchTerm, filters, visitors]);

    // --- API ACTIONS ---

    const fetchVisitors = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/all-visitors`);
            setVisitors(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    const toggleBanStatus = async (e, id) => {
        if(e) e.stopPropagation();
        if(!window.confirm("Are you sure you want to change this visitor's status?")) return;
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/admin/visitors/${id}/status`);
            fetchVisitors(); 
            if(selectedVisitor && selectedVisitor.VisitorID === id) {
                const updated = { ...selectedVisitor, Status: selectedVisitor.Status === 'Banned' ? 'Active' : 'Banned' };
                setSelectedVisitor(updated);
            }
        } catch (error) { alert("Failed to update status."); }
    };

    const toggleWatchlist = async (e, id, currentStatus) => {
        if(e) e.stopPropagation(); 
        let reason = null;
        if (!currentStatus) {
            reason = window.prompt("🚩 FLAGGING VISITOR\n\nEnter reason (e.g. 'Refused Search', 'Invalid ID'):", "Suspicious Behavior");
            if (reason === null) return; 
        } else {
            if(!window.confirm("Remove from watchlist?")) return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/admin/visitors/${id}/watchlist`, { reason });
            fetchVisitors(); 
             if(selectedVisitor && selectedVisitor.VisitorID === id) {
                // Refresh full visitor data to get the new Security Log
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visitors/${id}`);
                setSelectedVisitor(response.data);
            }
        } catch (error) { alert("Failed to update watchlist."); }
    };
    
    const handleRowClick = async (visitor) => {
        setShowModal(true);
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visitors/${visitor.VisitorID}`);
            setSelectedVisitor(response.data);
        } catch (error) { console.error(error); } 
        finally { setHistoryLoading(false); }
    };

    // --- HELPER: STATUS BADGE ---
    const getStatusBadge = (visitor) => {
        if (visitor.Status === 'Banned') {
            return (
                <span style={{
                    backgroundColor: '#fee2e2', color: '#991b1b', 
                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', 
                    display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fecaca'
                }}>
                    🚫 BANNED
                </span>
            );
        }
        if (!!visitor.IsWatchlisted) {
            return (
                <span style={{
                    backgroundColor: '#fef3c7', color: '#92400e', 
                    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fde68a'
                }}>
                    ⚠️ FLAGGED
                </span>
            );
        }
        return (
            <span style={{
                backgroundColor: '#def7ec', color: '#03543f', 
                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                border: '1px solid #bcf0da'
            }}>
                ✅ ACTIVE
            </span>
        );
    };

    // --- EXPORTS ---

    const downloadCSV = () => {
        const headers = ["Visitor ID", "Full Name", "Affiliation", "Sex", "Age", "Current Status", "Visit Date", "Time In", "Time Out", "Purpose", "Department", "Security Event", "Event Reason"];
        const rows = [];
        filteredVisitors.forEach(visitor => {
            if (visitor.logs && visitor.logs.length > 0) {
                visitor.logs.forEach(log => {
                    let flagType = "Clean";
                    let flagReason = "-";

                    if (log.IsFlagged) {
                        flagType = "AI FLAGGED";
                        flagReason = log.FlagReason;
                    } else if (log.IsManualFlag) {
                        flagType = "OFFICER FLAGGED";
                        flagReason = log.ManualFlagReason;
                    }

                    rows.push([
                        visitor.VisitorID, `"${visitor.FullName}"`, visitor.AffiliationType || "Visitor",
                        visitor.Sex, visitor.Age, visitor.Status,
                        new Date(log.EntryTimestamp).toLocaleDateString(),
                        new Date(log.EntryTimestamp).toLocaleTimeString(),
                        log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString() : "Still Inside",
                        `"${log.PurposeOfVisit}"`, 
                        log.DepartmentToVisit || "-",
                        flagType,
                        `"${flagReason}"`
                    ].join(","));
                });
            } else {
                rows.push([visitor.VisitorID, `"${visitor.FullName}"`, visitor.AffiliationType || "Visitor", visitor.Sex, visitor.Age, visitor.Status, "-", "-", "-", "-", "-", "-", "-" ].join(","));
            }
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `visecure_audit_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("ViSecure - Visitor Audit Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        const tableColumn = ["ID", "Name", "Type", "Time In", "Time Out", "Dept", "Security"];
        const tableRows = [];
        filteredVisitors.forEach(visitor => {
            const logs = visitor.logs && visitor.logs.length > 0 ? visitor.logs : [{}];
            logs.forEach(log => {
                let securityStatus = "OK";
                if(log.IsFlagged) securityStatus = `AI: ${log.FlagReason}`;
                else if(log.IsManualFlag) securityStatus = `OFFICER: ${log.ManualFlagReason}`;

                const visitorData = [
                    visitor.VisitorID, visitor.FullName, visitor.AffiliationType,
                    log.EntryTimestamp ? new Date(log.EntryTimestamp).toLocaleTimeString() : '-',
                    log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString() : 'Active',
                    log.DepartmentToVisit || '-', 
                    securityStatus
                ];
                tableRows.push(visitorData);
            });
        });
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 40, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });
        doc.save(`visecure_report_${Date.now()}.pdf`);
    };

    // --- UI HELPERS ---
    const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => { setFilters({ status: 'All', affiliation: 'All', regStart: '', regEnd: '', visitStart: '', visitEnd: '' }); setSearchTerm(''); };
    const uniqueAffiliations = [...new Set(visitors.map(v => v.AffiliationType || 'Visitor'))];

    // --- STYLES ---
    const styles = {
        topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
        searchGroup: { display: 'flex', gap: '10px', alignItems: 'center' },
        searchInput: { padding: '10px 15px', width: '250px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
        iconBtn: { backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600' },
        
        filterPanel: { 
            backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '20px', 
            border: '1px solid #e5e7eb', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start',
            animation: 'fadeIn 0.3s ease-in-out'
        },
        filterSection: { display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '20px', borderRight: '1px solid #e5e7eb' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
        label: { fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
        select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', minWidth: '160px' },
        dateInput: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' },
        clearBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', alignSelf: 'flex-end', marginBottom: '5px' },
        exportBtn: { backgroundColor: '#0e9f6e', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
        
        // Table Styles
        tableWrapper: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
        th: { backgroundColor: '#f9fafb', color: '#6b7280', padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
        td: { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#1f2937', verticalAlign: 'middle' },
        row: { cursor: 'pointer', transition: 'all 0.1s ease-in-out' },
        
        // User Cell
        userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
        avatar: { 
            width: '36px', height: '36px', borderRadius: '50%', 
            backgroundColor: '#e0e7ff', color: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700'
        },
        userInfo: { display: 'flex', flexDirection: 'column' },
        userName: { fontWeight: '600', color: '#111827' },
        userEmail: { fontSize: '12px', color: '#6b7280' },

        // Action Icons
        actionBtn: { 
            background: 'none', border: 'none', cursor: 'pointer', 
            padding: '8px', borderRadius: '6px', fontSize: '16px',
            transition: 'background 0.2s', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center'
        },

        // Modal Styles
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '900px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
        closeBtn: { alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' },
        
        // New Modal Action Button Styles
        modalActionBtn: {
            width: '100%', padding: '10px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
        }
    };

    return (
        <div className="fade-in">
            {/* 1. TOP BAR */}
            <div style={styles.topBar}>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#1a1c23', fontWeight: '700' }}>
                    📂 Visitor Master Records
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '10px', fontWeight: '400' }}>
                        ({filteredVisitors.length} records found)
                    </span>
                </h2>
                
                <div style={styles.searchGroup}>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="🔍 Search name, ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        style={{ ...styles.iconBtn, backgroundColor: showFilters ? '#e5e7eb' : 'white' }}
                        title="Toggle Advanced Filters"
                    >
                        ⚙️ Filters
                    </button>
                    <div style={{height: '20px', width: '1px', backgroundColor: '#d1d5db', margin: '0 5px'}}></div>
                    <button onClick={downloadCSV} style={styles.exportBtn}>📥 CSV</button>
                    <button onClick={downloadPDF} style={{...styles.exportBtn, backgroundColor: '#b91c1c', marginLeft: '5px'}}>📄 PDF</button>
                </div>
            </div>

            {/* 2. COLLAPSIBLE FILTER PANEL */}
            {showFilters && (
                <div style={styles.filterPanel}>
                    {/* SECTION 1: ATTRIBUTES */}
                    <div style={styles.filterSection}>
                        <div style={styles.inputGroup}>
                            <span style={styles.label}>Status</span>
                            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} style={styles.select}>
                                <option value="All">All Statuses</option>
                                <option value="Active">✅ Active Only</option>
                                <option value="Banned">🚫 Banned</option>
                                <option value="Watchlisted">⚠️ Watchlisted</option>
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <span style={styles.label}>Affiliation</span>
                            <select value={filters.affiliation} onChange={(e) => handleFilterChange('affiliation', e.target.value)} style={styles.select}>
                                <option value="All">All Types</option>
                                {uniqueAffiliations.map(type => (<option key={type} value={type}>{type}</option>))}
                            </select>
                        </div>
                    </div>

                    {/* SECTION 2: REGISTRATION DATE */}
                    <div style={styles.filterSection}>
                        <span style={{fontSize: '11px', fontWeight: 'bold', color: '#374151', marginBottom: '5px'}}>📅 REGISTRATION DATE</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={styles.inputGroup}>
                                <span style={styles.label}>From</span>
                                <input type="date" value={filters.regStart} onChange={(e) => handleFilterChange('regStart', e.target.value)} style={styles.dateInput} />
                            </div>
                            <div style={styles.inputGroup}>
                                <span style={styles.label}>To</span>
                                <input type="date" value={filters.regEnd} onChange={(e) => handleFilterChange('regEnd', e.target.value)} style={styles.dateInput} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: VISIT DATE */}
                    <div style={{...styles.filterSection, borderRight: 'none'}}>
                         <span style={{fontSize: '11px', fontWeight: 'bold', color: '#0e9f6e', marginBottom: '5px'}}>👣 VISIT HISTORY (ENTRY)</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={styles.inputGroup}>
                                <span style={styles.label}>From</span>
                                <input type="date" value={filters.visitStart} onChange={(e) => handleFilterChange('visitStart', e.target.value)} style={styles.dateInput} />
                            </div>
                            <div style={styles.inputGroup}>
                                <span style={styles.label}>To</span>
                                <input type="date" value={filters.visitEnd} onChange={(e) => handleFilterChange('visitEnd', e.target.value)} style={styles.dateInput} />
                            </div>
                        </div>
                    </div>

                    <button onClick={clearFilters} style={styles.clearBtn}>✖ Reset</button>
                </div>
            )}
            
            {/* 3. TABLE */}
            {loading ? <p>Loading records...</p> : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Visitor</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Last Visit</th>
                                <th style={{...styles.th, textAlign: 'right'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVisitors.length > 0 ? filteredVisitors.map((visitor) => {
                                // Calculate Last Visit
                                const lastLog = visitor.logs && visitor.logs.length > 0 
                                    ? visitor.logs.sort((a,b) => new Date(b.EntryTimestamp) - new Date(a.EntryTimestamp))[0] 
                                    : null;
                                const lastVisitDate = lastLog ? new Date(lastLog.EntryTimestamp).toLocaleDateString() : 'Never';

                                return (
                                    <tr 
                                        key={visitor.VisitorID} 
                                        style={styles.row} 
                                        onClick={() => handleRowClick(visitor)}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        {/* 1. VISITOR IDENTITY */}
                                        <td style={styles.td}>
                                            <div style={styles.userCell}>
                                                <div style={styles.avatar}>
                                                    {(visitor.FirstName && visitor.FirstName[0])}{(visitor.Surname && visitor.Surname[0])}
                                                </div>
                                                <div style={styles.userInfo}>
                                                    <span style={styles.userName}>{visitor.FullName}</span>
                                                    <span style={styles.userEmail}>ID: {visitor.VisitorID}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. AFFILIATION */}
                                        <td style={styles.td}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                                backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: '500'
                                            }}>
                                                {visitor.AffiliationType || 'Visitor'}
                                            </span>
                                        </td>

                                        {/* 3. STATUS BADGE */}
                                        <td style={styles.td}>
                                            {getStatusBadge(visitor)}
                                        </td>

                                        {/* 4. LAST VISIT */}
                                        <td style={{...styles.td, color: '#6b7280', fontSize: '13px'}}>
                                            {lastVisitDate}
                                        </td>

                                        {/* 5. ACTIONS */}
                                        <td style={{...styles.td, textAlign: 'right'}}>
                                            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '5px'}}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRowClick(visitor); }}
                                                    style={{...styles.actionBtn, color: '#3b82f6', backgroundColor: '#eff6ff', borderRadius: '50%', width: '30px', height: '30px', padding: 0}} 
                                                    title="View Details"
                                                >
                                                    <IconEye />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="5" style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>No records match your filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* VISITOR DETAILS MODAL */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        
                        {historyLoading || !selectedVisitor ? <p>Loading details...</p> : (
                            <div style={{ display: 'flex', gap: '30px' }}>
                                {/* LEFT: PROFILE & ACTIONS */}
                                <div style={{ flex: 1, borderRight: '1px solid #e5e7eb', paddingRight: '20px' }}>
                                    <h2 style={{ marginTop: 0, color: '#111827' }}>
                                        {selectedVisitor.FullName}
                                        {!!selectedVisitor.IsWatchlisted && <span style={{fontSize: '0.6em', color: '#eab308'}}> (⚠️ Watchlisted)</span>}
                                    </h2>
                                    <p style={{ color: '#6b7280', fontSize: '14px' }}>Visitor ID: #{selectedVisitor.VisitorID}</p>
                                    
                                    {/* 🟢 RESTORED: RICH PROFILE DETAILS */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                        <div><strong>Type:</strong> {selectedVisitor.AffiliationType}</div>
                                        <div><strong>Sex:</strong> {selectedVisitor.Sex}</div>
                                        <div><strong>Age:</strong> {selectedVisitor.Age}</div>
                                        <div><strong>Phone:</strong> {selectedVisitor.ContactNumber || 'N/A'}</div>
                                        <div><strong>Email:</strong> {selectedVisitor.Email || 'N/A'}</div>
                                        <div><strong>Status:</strong> {selectedVisitor.Status}</div>

                                        {/* SECURITY ACTIONS */}
                                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Security Controls</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <button 
                                                    onClick={(e) => toggleWatchlist(e, selectedVisitor.VisitorID, selectedVisitor.IsWatchlisted)}
                                                    style={{
                                                        ...styles.modalActionBtn,
                                                        backgroundColor: selectedVisitor.IsWatchlisted ? '#fef3c7' : '#fffbeb', 
                                                        color: selectedVisitor.IsWatchlisted ? '#92400e' : '#d97706',
                                                        border: '1px solid #fcd34d'
                                                    }}
                                                >
                                                    {selectedVisitor.IsWatchlisted ? <><IconFlag/> Unflag / Unban (Safe)</> : <><IconFlag/> Flag / Ban Visitor</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* RIGHT: AUDIT LOG TIMELINE */}
                                <div style={{ flex: 2 }}>
                                    <h3 style={{ marginTop: 0, color: '#374151' }}>📜 Security Audit Trail</h3>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', padding: '15px' }}>
                                        
                                        {/* 1. Show Security Logs (Bans/Unbans) */}
                                        {selectedVisitor.security_logs && selectedVisitor.security_logs.length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {selectedVisitor.security_logs.map(log => (
                                                    <li key={log.id} style={{ marginBottom: '15px', borderLeft: '2px solid #d1d5db', paddingLeft: '15px', position: 'relative' }}>
                                                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>
                                                            {new Date(log.created_at).toLocaleString()} • {log.Officer}
                                                        </div>
                                                        <div style={{ fontWeight: 'bold', color: log.Action.includes('BAN') || log.Action === 'FLAG' ? '#b91c1c' : '#059669' }}>
                                                            {log.Action}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#374151' }}>
                                                            Reason: "{log.Reason}"
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>No security incidents recorded.</p>
                                        )}
                                    </div>

                                    {/* 2. Show Normal Visits (RESTORED DEPT & ARROWS) */}
                                    <h4 style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '10px', color: '#374151' }}>Recent Visits</h4>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Date</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>In / Out</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Purpose</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Dept</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVisitor.logs && selectedVisitor.logs.length > 0 ? selectedVisitor.logs.map(log => (
                                                    <tr key={log.LogID} style={{borderBottom: '1px solid #f3f4f6'}}>
                                                        <td style={{padding: '8px'}}>{new Date(log.EntryTimestamp).toLocaleDateString()}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            {/* 🟢 ENTRY ARROW */}
                                                            <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                ⬇ {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </div>
                                                            {/* 🔴 EXIT ARROW or ACTIVE PILL */}
                                                            {log.ExitTimestamp ? 
                                                                <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                    ⬆ {new Date(log.ExitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </div> : 
                                                                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '2px', display: 'inline-block' }}>ACTIVE</span>
                                                            }
                                                        </td>
                                                        <td style={{padding: '8px'}}>
                                                            {log.PurposeOfVisit}
                                                            {log.IsFlagged && <div style={{fontSize: '10px', color: '#b91c1c', fontWeight: 'bold'}}>⚠️ SUSPICIOUS</div>}
                                                        </td>
                                                        <td style={{padding: '8px'}}>{log.DepartmentToVisit || '-'}</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="4" style={{padding: '15px', color: '#9ca3af', textAlign: 'center'}}>No visit history found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}