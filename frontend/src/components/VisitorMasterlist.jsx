import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VisitorMasterList() {
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // 🔍 SEARCH, FILTER & SORT STATES
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    const [filterType, setFilterType] = useState('all'); 
    const [sortConfig, setSortConfig] = useState({ key: 'LastVisit', direction: 'desc' });
    
    const [filters, setFilters] = useState({ affiliation: 'All', regStart: '', regEnd: '', visitStart: '', visitEnd: '' });

    // 🛠️ MODAL STATE
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [inputMode, setInputMode] = useState(null); 
    const [actionReason, setActionReason] = useState(""); 

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => { if (!selectedVisitor) { setInputMode(null); setActionReason(""); } }, [selectedVisitor]);
    useEffect(() => { fetchVisitors(); }, []);

    // 🧠 ADVANCED FILTER & SORT LOGIC
    useEffect(() => {
        let results = [...visitors];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            results = results.filter(v => 
                v.FullName.toLowerCase().includes(lowerTerm) ||
                (v.AffiliationType && v.AffiliationType.toLowerCase().includes(lowerTerm)) ||
                (v.ContactNumber && v.ContactNumber.toLowerCase().includes(lowerTerm)) ||
                (v.Email && v.Email.toLowerCase().includes(lowerTerm)) ||
                v.VisitorID.toString().includes(lowerTerm)
            );
        }

        if (filterType !== 'all') {
            if (filterType === 'banned') results = results.filter(v => v.Status === 'Banned');
            else if (filterType === 'watchlisted') results = results.filter(v => Boolean(v.IsWatchlisted) && v.Status !== 'Banned');
            else if (filterType === 'active') results = results.filter(v => v.Status === 'Active' && !v.IsWatchlisted);
        }

        if (filters.affiliation !== 'All') results = results.filter(v => v.AffiliationType === filters.affiliation || v.VisitorType === filters.affiliation);
        if (filters.regStart) results = results.filter(v => new Date(v.created_at) >= new Date(filters.regStart));
        if (filters.regEnd) {
            const endDate = new Date(filters.regEnd); endDate.setHours(23, 59, 59);
            results = results.filter(v => new Date(v.created_at) <= endDate);
        }
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

        results.sort((a, b) => {
            let aVal, bVal;
            if (sortConfig.key === 'FullName') { aVal = a.FullName.toLowerCase(); bVal = b.FullName.toLowerCase(); } 
            else if (sortConfig.key === 'AffiliationType') { aVal = (a.AffiliationType || a.VisitorType || '').toLowerCase(); bVal = (b.AffiliationType || b.VisitorType || '').toLowerCase(); } 
            else if (sortConfig.key === 'created_at') { aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); } 
            else if (sortConfig.key === 'LastVisit') {
                aVal = a.logs && a.logs.length > 0 ? Math.max(...a.logs.map(l => new Date(l.EntryTimestamp).getTime())) : 0;
                bVal = b.logs && b.logs.length > 0 ? Math.max(...b.logs.map(l => new Date(l.EntryTimestamp).getTime())) : 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredVisitors(results);
    }, [searchTerm, filterType, filters, sortConfig, visitors]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleAdvancedSortChange = (e) => {
        const [key, direction] = e.target.value.split('|');
        setSortConfig({ key, direction });
    };

    const fetchVisitors = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/admin/all-visitors`);
            setVisitors(response.data);
            setLoading(false);
        } catch (error) { console.error(error); setLoading(false); }
    };

    // --- 🌍 UNIFIED GLOBAL CLEARANCE ACTION ---
    const handleGlobalClearance = async (targetLevel) => {
        if (!selectedVisitor) return;
        const vid = selectedVisitor.VisitorID;

        try {
            await axios.post(`${API_BASE}/api/visitors/${vid}/global-status`, {
                status: targetLevel,
                reason: targetLevel === 'Cleared' ? 'Record Cleared' : actionReason
            });

            fetchVisitors(); 
            const response = await axios.get(`${API_BASE}/api/visitors/${vid}`);
            setSelectedVisitor(response.data);
            setInputMode(null); setActionReason("");
        } catch (error) { alert("Action Failed. Please check network."); }
    };
    
    const handleRowClick = async (visitor) => {
        setShowModal(true);
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/api/visitors/${visitor.VisitorID}`);
            setSelectedVisitor(response.data);
        } catch (error) { console.error(error); } 
        finally { setHistoryLoading(false); }
    };

    const getStatusBadge = (visitor) => {
        if (visitor.Status === 'Banned') return <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', border: '1px solid #fecaca' }}>🚫 BANNED</span>;
        if (!!visitor.IsWatchlisted) return <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', border: '1px solid #fde68a' }}>⚠️ FLAGGED</span>;
        return <span style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', border: '1px solid #bcf0da' }}>🟢 CLEARED</span>;
    };

    // --- UI HELPERS ---
    const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => { 
        setFilters({ affiliation: 'All', regStart: '', regEnd: '', visitStart: '', visitEnd: '' }); 
        setSearchTerm(''); setFilterType('all'); setSortConfig({ key: 'LastVisit', direction: 'desc' });
    };
    
    const uniqueAffiliations = [...new Set(visitors.map(v => v.AffiliationType || v.VisitorType || 'Visitor'))];
    
    const activeCount = visitors.filter(v => v.Status === 'Active' && !v.IsWatchlisted).length;
    const watchlistedCount = visitors.filter(v => Boolean(v.IsWatchlisted) && v.Status !== 'Banned').length;
    const bannedCount = visitors.filter(v => v.Status === 'Banned').length;

    const ChipButton = ({ label, count, active, type, onClick }) => {
        let baseColor = '#e5e7eb'; let activeColor = '#1f2937'; let textColor = '#374151'; let activeText = 'white';
        if (type === 'banned') { baseColor = '#fee2e2'; activeColor = '#dc2626'; textColor = '#b91c1c'; }
        if (type === 'watchlisted') { baseColor = '#fef3c7'; activeColor = '#d97706'; textColor = '#92400e'; }
        if (type === 'active') { baseColor = '#dcfce7'; activeColor = '#16a34a'; textColor = '#166534'; }
        return (
            <button onClick={onClick} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginRight: '8px', backgroundColor: active ? activeColor : baseColor, color: active ? activeText : textColor }}>
                {label} <span style={{ opacity: 0.8, fontSize: '0.9em', marginLeft: '4px' }}>({count})</span>
            </button>
        );
    };

    const SortableHeader = ({ label, sortKey }) => {
        const isActive = sortConfig.key === sortKey;
        return (
            <th style={{...styles.th, cursor: 'pointer', userSelect: 'none', backgroundColor: isActive ? '#f3f4f6' : '#f9fafb'}} onClick={() => requestSort(sortKey)} title={`Click to sort by ${label}`}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <span style={{ color: isActive ? '#111827' : '#6b7280' }}>{label}</span>
                    <span style={{ color: isActive ? '#4f46e5' : '#d1d5db', fontWeight: isActive ? '900' : 'normal', fontSize: isActive ? '16px' : '14px', transition: 'all 0.2s' }}>
                        {isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                </div>
            </th>
        );
    };

    // --- 📥 EXPORTS LOGIC ---

    const downloadCSV = () => {
        const headers = [
            "Visitor ID", "Full Name", "Age", "Sex", "Contact", "Email", 
            "Classification", "Clearance Status", "Registration Date",
            "Log - Date", "Log - Time In", "Log - Time Out", "Log - Purpose", "Log - Department", "Log - Person To Visit" // 🆕 Added Person To Visit
        ];
        
        const rows = [];
        
        filteredVisitors.forEach(v => {
            const status = v.Status === 'Banned' ? 'BANNED' : (v.IsWatchlisted ? 'FLAGGED' : 'CLEARED');
            const baseData = [
                v.VisitorID, 
                `"${v.FullName}"`, 
                v.Age || "N/A", 
                v.Sex || "N/A", 
                `"${v.ContactNumber || "N/A"}"`, 
                `"${v.Email || "N/A"}"`, 
                `"${v.AffiliationType || v.VisitorType || "Guest"}"`, 
                status, 
                new Date(v.created_at).toLocaleDateString()
            ];

            if (!v.logs || v.logs.length === 0) {
                rows.push([...baseData, "No visits", "-", "-", "-", "-", "-"].join(",")); // 🆕 Added extra '-' for the new column
            } else {
                const sortedLogs = [...v.logs].sort((a,b) => new Date(b.EntryTimestamp) - new Date(a.EntryTimestamp));
                sortedLogs.forEach(log => {
                    const logDate = new Date(log.EntryTimestamp).toLocaleDateString();
                    const timeIn = new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const timeOut = log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "ACTIVE";
                    
                    rows.push([
                        ...baseData, 
                        `"${logDate}"`, 
                        `"${timeIn}"`, 
                        `"${timeOut}"`, 
                        `"${log.PurposeOfVisit || '-'}"`, 
                        `"${log.DepartmentToVisit || '-'}"`,
                        `"${log.PersonToVisit || '-'}"` // 🆕 Added Person To Visit Data
                    ].join(","));
                });
            }
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ViSecure_Detailed_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        try {
            const doc = new jsPDF('landscape');
            doc.setFontSize(18);
            doc.text("ViSecure - Master Visitor Records", 14, 22);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${filteredVisitors.length}`, 14, 30);

            const tableData = filteredVisitors.map(v => {
                const lastLog = v.logs && v.logs.length > 0 ? [...v.logs].sort((a,b) => new Date(b.EntryTimestamp) - new Date(a.EntryTimestamp))[0] : null;
                const status = v.Status === 'Banned' ? 'BANNED' : (v.IsWatchlisted ? 'FLAGGED' : 'CLEARED');
                return [
                    String(v.VisitorID),
                    v.FullName,
                    v.AffiliationType || v.VisitorType || 'Guest',
                    status,
                    String(v.logs ? v.logs.length : 0),
                    new Date(v.created_at).toLocaleDateString(),
                    lastLog ? new Date(lastLog.EntryTimestamp).toLocaleDateString() : 'N/A'
                ];
            });

            autoTable(doc, {
                startY: 40,
                head: [['ID', 'Full Name', 'Classification', 'Status', 'Total Visits', 'Registered', 'Last Visit']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [31, 41, 55] },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 3) {
                        if (data.cell.raw === 'BANNED') data.cell.styles.textColor = [220, 38, 38]; 
                        else if (data.cell.raw === 'FLAGGED') data.cell.styles.textColor = [217, 119, 6]; 
                        else if (data.cell.raw === 'CLEARED') data.cell.styles.textColor = [16, 185, 129]; 
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            doc.save(`ViSecure_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("PDF Error: ", error);
            alert("Failed to generate PDF. Please check the console.");
        }
    };

    const downloadVisitorProfilePDF = () => {
        if (!selectedVisitor) return;
        try {
            const doc = new jsPDF();
            let currentY = 20;

            doc.setFontSize(18);
            doc.text(`Security Dossier: ${selectedVisitor.FullName}`, 14, currentY);
            currentY += 8;

            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`ID: #${selectedVisitor.VisitorID} | Classification: ${selectedVisitor.AffiliationType || selectedVisitor.VisitorType} | Status: ${selectedVisitor.Status}`, 14, currentY);
            currentY += 15;

            autoTable(doc, {
                startY: currentY,
                head: [['Personal Information', '']],
                body: [
                    ['Age', String(selectedVisitor.Age || 'N/A')],
                    ['Sex', selectedVisitor.Sex || 'N/A'],
                    ['Contact Number', selectedVisitor.ContactNumber || 'N/A'],
                    ['Email Address', selectedVisitor.Email || 'N/A']
                ],
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 15;
            doc.setFontSize(14); doc.setTextColor(17, 24, 39);
            doc.text("Security Audit Trail", 14, currentY);
            
            const secLogs = selectedVisitor.security_logs || selectedVisitor.securityLogs || [];
            const secData = secLogs.map(log => [
                new Date(log.created_at).toLocaleString(),
                log.Action.replace(/_/g, ' '),
                log.Reason,
                log.Officer
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Date / Time', 'Action', 'Reason', 'Officer']],
                body: secData.length > 0 ? secData : [['-', '✅ No security incidents recorded', '-', '-']],
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 15;
            doc.setFontSize(14); doc.setTextColor(17, 24, 39);
            doc.text("Complete Visit History", 14, currentY);

            const visitData = (selectedVisitor.logs || []).map(log => [
                new Date(log.EntryTimestamp).toLocaleDateString(),
                new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'ACTIVE',
                log.PurposeOfVisit || '-',
                log.DepartmentToVisit || '-',
                log.PersonToVisit || '-' // 🆕 Added Person To Visit Data
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Date', 'Time In', 'Time Out', 'Purpose', 'Department', 'Host / Person']], // 🆕 Added Column Header
                body: visitData.length > 0 ? visitData : [['-', 'No visits recorded', '-', '-', '-', '-']],
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            });

            doc.save(`ViSecure_Dossier_${selectedVisitor.FullName.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("PDF Error: ", error);
            alert("Failed to export profile.");
        }
    };

    // --- STYLES ---
    const styles = {
        topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
        searchGroup: { display: 'flex', gap: '10px', alignItems: 'center' },
        searchInput: { padding: '10px 15px', width: '250px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
        iconBtn: { backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600' },
        filterPanel: { backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e5e7eb', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-in-out' },
        filterSection: { display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '20px', borderRight: '1px solid #e5e7eb' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
        label: { fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
        select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', minWidth: '160px', cursor: 'pointer' },
        dateInput: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' },
        clearBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', alignSelf: 'flex-end', marginBottom: '5px' },
        tableWrapper: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
        th: { backgroundColor: '#f9fafb', padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' },
        td: { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#1f2937', verticalAlign: 'middle' },
        row: { cursor: 'pointer', transition: 'all 0.1s ease-in-out' },
        avatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', marginRight: '12px', flexShrink: 0 },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
        modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '900px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
        closeBtn: { alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' },
        inputStyle: { width: '100%', padding: '10px', borderRadius: '6px', fontSize:'13px', boxSizing: 'border-box', marginTop:'5px', outline:'none' }
    };

    const secLogs = selectedVisitor ? (selectedVisitor.security_logs || selectedVisitor.securityLogs || []) : [];

    return (
        <div className="fade-in">
            {/* 1. TOP BAR */}
            <div style={styles.topBar}>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#1a1c23', fontWeight: '700' }}>📂 Visitor Master Records</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={styles.searchGroup}>
                        <input type="text" placeholder="🔍 Search name, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                        <button onClick={() => setShowFilters(!showFilters)} style={{ ...styles.iconBtn, backgroundColor: showFilters ? '#e5e7eb' : 'white' }}>⚙️ Filters</button>
                        
                        {/* UNIFIED EXPORT DROPDOWN MENU */}
                        <div style={{width: '1px', height: '24px', backgroundColor: '#d1d5db', margin: '0 5px'}}></div>
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => setShowExportMenu(!showExportMenu)} 
                                style={{ ...styles.iconBtn, backgroundColor: showExportMenu ? '#e5e7eb' : 'white' }}
                            >
                                📥 Export ▾
                            </button>
                            
                            {showExportMenu && (
                                <div className="fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '180px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <button 
                                        onClick={() => { downloadCSV(); setShowExportMenu(false); }} 
                                        style={{ padding: '12px 15px', textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        📊 Full List (CSV)
                                    </button>
                                    <button 
                                        onClick={() => { downloadPDF(); setShowExportMenu(false); }} 
                                        style={{ padding: '12px 15px', textAlign: 'left', background: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                    >
                                        📄 Summary (PDF)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ChipButton label="All Records" count={visitors.length} active={filterType === 'all'} onClick={() => setFilterType('all')} />
                        <ChipButton label="🟢 Cleared" count={activeCount} active={filterType === 'active'} type="active" onClick={() => setFilterType('active')} />
                        <ChipButton label="⚠️ Flagged" count={watchlistedCount} active={filterType === 'watchlisted'} type="watchlisted" onClick={() => setFilterType('watchlisted')} />
                        <ChipButton label="🚫 Banned" count={bannedCount} active={filterType === 'banned'} type="banned" onClick={() => setFilterType('banned')} />
                    </div>
                </div>
            </div>

            {/* 2. COLLAPSIBLE ADVANCED FILTER PANEL */}
            {showFilters && (
                <div style={styles.filterPanel}>
                    <div style={styles.filterSection}>
                        <div style={styles.inputGroup}>
                            <span style={styles.label}>Clearance Status</span>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.select}>
                                <option value="all">All Statuses</option>
                                <option value="active">🟢 Cleared (Active)</option>
                                <option value="watchlisted">⚠️ Flagged / Watchlist</option>
                                <option value="banned">🚫 Banned</option>
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <span style={styles.label}>Sort By</span>
                            <select value={`${sortConfig.key}|${sortConfig.direction}`} onChange={handleAdvancedSortChange} style={styles.select}>
                                <option value="LastVisit|desc">Last Visit (Newest)</option>
                                <option value="LastVisit|asc">Last Visit (Oldest)</option>
                                <option value="created_at|desc">First Registered (Newest)</option>
                                <option value="created_at|asc">First Registered (Oldest)</option>
                                <option value="FullName|asc">Visitor Name (A-Z)</option>
                                <option value="FullName|desc">Visitor Name (Z-A)</option>
                            </select>
                        </div>
                    </div>
                    <div style={styles.filterSection}>
                        <div style={styles.inputGroup}>
                            <span style={styles.label}>Classification</span>
                            <select value={filters.affiliation} onChange={(e) => handleFilterChange('affiliation', e.target.value)} style={styles.select}>
                                <option value="All">All Types</option>
                                {uniqueAffiliations.map(type => (<option key={type} value={type}>{type}</option>))}
                            </select>
                        </div>
                    </div>
                    <div style={styles.filterSection}>
                        <span style={{fontSize: '11px', fontWeight: 'bold', color: '#374151', marginBottom: '5px'}}>📅 REGISTRATION DATE</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={styles.inputGroup}><span style={styles.label}>From</span><input type="date" value={filters.regStart} onChange={(e) => handleFilterChange('regStart', e.target.value)} style={styles.dateInput} /></div>
                            <div style={styles.inputGroup}><span style={styles.label}>To</span><input type="date" value={filters.regEnd} onChange={(e) => handleFilterChange('regEnd', e.target.value)} style={styles.dateInput} /></div>
                        </div>
                    </div>
                    <div style={{...styles.filterSection, borderRight: 'none'}}>
                         <span style={{fontSize: '11px', fontWeight: 'bold', color: '#0e9f6e', marginBottom: '5px'}}>👣 VISIT HISTORY (ENTRY)</span>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={styles.inputGroup}><span style={styles.label}>From</span><input type="date" value={filters.visitStart} onChange={(e) => handleFilterChange('visitStart', e.target.value)} style={styles.dateInput} /></div>
                            <div style={styles.inputGroup}><span style={styles.label}>To</span><input type="date" value={filters.visitEnd} onChange={(e) => handleFilterChange('visitEnd', e.target.value)} style={styles.dateInput} /></div>
                        </div>
                    </div>
                    <button onClick={clearFilters} style={styles.clearBtn}>✖ Reset All</button>
                </div>
            )}
            
            {/* 3. GROUPED TABLE UI */}
            {loading ? <p>Loading records...</p> : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <SortableHeader label="Visitor Identity" sortKey="FullName" />
                                <SortableHeader label="Classification" sortKey="AffiliationType" />
                                <th style={{...styles.th, cursor: 'default'}}>Clearance</th>
                                <SortableHeader label="First Registered" sortKey="created_at" />
                                <SortableHeader label="Last Visit" sortKey="LastVisit" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVisitors.length > 0 ? filteredVisitors.map((visitor) => {
                                const lastLog = visitor.logs && visitor.logs.length > 0 ? [...visitor.logs].sort((a,b) => new Date(b.EntryTimestamp) - new Date(a.EntryTimestamp))[0] : null;
                                const displayClassification = visitor.AffiliationType || visitor.VisitorType || 'Visitor';

                                return (
                                    <tr key={visitor.VisitorID} style={styles.row} onClick={() => handleRowClick(visitor)} title="Click to view full security profile" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                                        <td style={styles.td}>
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                <div style={styles.avatar}>{(visitor.FirstName && visitor.FirstName[0])}{(visitor.Surname && visitor.Surname[0])}</div>
                                                <div>
                                                    <div style={{fontWeight: 'bold', color: '#111827', fontSize: '15px'}}>{visitor.FullName}</div>
                                                    <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px', fontWeight: '500'}}>ID: #{visitor.VisitorID}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}><div style={{fontWeight: '600', color: '#374151'}}>{displayClassification}</div></td>
                                        <td style={styles.td}>{getStatusBadge(visitor)}</td>
                                        <td style={styles.td}>
                                            <div style={{color: '#4b5563', fontSize: '13px'}}>{new Date(visitor.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                        </td>
                                        <td style={styles.td}>
                                            {lastLog ? (
                                                <div>
                                                    <div style={{color: '#111827', fontWeight: '500', fontSize: '13px'}}>{new Date(lastLog.EntryTimestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                                    <div style={{color: '#6b7280', fontSize: '11px', marginTop: '2px'}}>{new Date(lastLog.EntryTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            ) : (<span style={{color: '#9ca3af', fontSize: '13px', fontStyle: 'italic'}}>No visits yet</span>)}
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
            
            {/* 4. MODAL */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button style={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        
                        {historyLoading || !selectedVisitor ? <p>Loading details...</p> : (
                            <div style={{ display: 'flex', gap: '30px' }}>
                                {/* LEFT: PROFILE & ACTIONS */}
                                <div style={{ flex: 1, borderRight: '1px solid #e5e7eb', paddingRight: '20px' }}>
                                    <h2 style={{ marginTop: 0, color: '#111827', marginBottom: '5px' }}>{selectedVisitor.FullName}</h2>
                                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>ID: #{selectedVisitor.VisitorID} • {selectedVisitor.AffiliationType || selectedVisitor.VisitorType}</p>
                                    
                                    {/* EXPORT DOSSIER BUTTON */}
                                    <button 
                                        onClick={downloadVisitorProfilePDF} 
                                        style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '13px' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e7ff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#eef2ff'; }}
                                    >
                                        📥 Download Full Security Dossier
                                    </button>

                                    <div style={{background:'#f9fafb', padding:'15px', borderRadius:'8px', marginTop:'20px', marginBottom:'20px', fontSize:'13px'}}>
                                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                            <div style={{gridColumn: 'span 2', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '4px'}}>
                                                <strong style={{color: '#4f46e5'}}>Personal Data</strong>
                                            </div>
                                            <div><strong>Age:</strong> {selectedVisitor.Age || 'N/A'}</div>
                                            <div><strong>Sex:</strong> {selectedVisitor.Sex || 'N/A'}</div>
                                            <div><strong>Phone:</strong> {selectedVisitor.ContactNumber || 'N/A'}</div>
                                            <div><strong>Email:</strong> {selectedVisitor.Email || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Global Status Control</h4>
                                        
                                        {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                            <div className="fade-in">
                                                <input type="text" autoFocus value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Reason for ${inputMode}...`} style={{...styles.inputStyle, border: `1px solid ${inputMode === 'ban' ? '#ef4444' : '#d97706'}`}} />
                                                <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                                    <button onClick={() => setInputMode(null)} style={{flex:1, padding:'8px', borderRadius:'6px', border:'none', cursor:'pointer'}}>Cancel</button>
                                                    <button onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')} style={{flex:1, padding:'8px', borderRadius:'6px', border:'none', cursor:'pointer', background: inputMode === 'ban' ? '#ef4444' : '#d97706', color:'white', fontWeight:'bold'}}>Confirm</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                                {selectedVisitor.Status === 'Banned' ? (
                                                    <button onClick={() => handleGlobalClearance('Cleared')} style={{ gridColumn: 'span 2', padding:'10px', background:'#10b981', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>✅ Unban User (Clear Record)</button>
                                                ) : selectedVisitor.IsWatchlisted == 1 ? (
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
                                
                                {/* RIGHT: AUDIT LOG TIMELINE */}
                                <div style={{ flex: 2 }}>
                                    <h3 style={{ marginTop: 0, color: '#374151' }}>📜 Security Audit Trail</h3>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', padding: '15px' }}>
                                        {secLogs.length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {secLogs.map(log => {
                                                    const isDanger = log.Action.includes('BAN') || log.Action.includes('FLAG') || log.Action.includes('OVERSTAY');
                                                    return (
                                                        <li key={log.id} style={{ marginBottom: '15px', borderLeft: '2px solid #d1d5db', paddingLeft: '15px', position: 'relative' }}>
                                                            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>{new Date(log.created_at).toLocaleString()} • {log.Officer}</div>
                                                            <div style={{ 
                                                                fontWeight: 'bold', 
                                                                color: isDanger ? '#b91c1c' : '#059669' 
                                                            }}>
                                                                {log.Action.replace(/_/g, ' ')}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: '#374151' }}>Reason: "{log.Reason}"</div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (<p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>No security incidents recorded.</p>)}
                                    </div>

                                    <h4 style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '10px', color: '#374151' }}>Recent Visits</h4>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Date</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>In / Out</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Purpose</th>
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Dept</th>
                                                    {/* 🆕 ADDED HOST HEADER TO MODAL UI */}
                                                    <th style={{textAlign:'left', padding:'8px', color: '#6b7280'}}>Host/Person</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVisitor.logs && selectedVisitor.logs.length > 0 ? selectedVisitor.logs.map(log => (
                                                    <tr key={log.LogID} style={{borderBottom: '1px solid #f3f4f6'}}>
                                                        <td style={{padding: '8px'}}>{new Date(log.EntryTimestamp).toLocaleDateString()}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>⬇ {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                            {log.ExitTimestamp ? 
                                                                <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>⬆ {new Date(log.ExitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div> : 
                                                                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '2px', display: 'inline-block' }}>ACTIVE</span>
                                                            }
                                                        </td>
                                                        <td style={{padding: '8px'}}>
                                                            {log.PurposeOfVisit}
                                                            {log.IsFlagged && <div style={{fontSize: '10px', color: '#b91c1c', fontWeight: 'bold'}}>⚠️ SUSPICIOUS</div>}
                                                        </td>
                                                        <td style={{padding: '8px'}}>{log.DepartmentToVisit || '-'}</td>
                                                        {/* 🆕 ADDED HOST DATA TO MODAL UI */}
                                                        <td style={{padding: '8px'}}>{log.PersonToVisit || '-'}</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="5" style={{padding: '15px', color: '#9ca3af', textAlign: 'center'}}>No visit history found.</td></tr>
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