import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VisitorMasterList() {
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [filterType, setFilterType] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'LastVisit', direction: 'desc' });
    const [filters, setFilters] = useState({ affiliation: 'All', regStart: '', regEnd: '', visitStart: '', visitEnd: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [inputMode, setInputMode] = useState(null);
    const [actionReason, setActionReason] = useState('');

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => { if (!selectedVisitor) { setInputMode(null); setActionReason(''); } }, [selectedVisitor]);
    useEffect(() => { fetchVisitors(); }, []);

    useEffect(() => {
        let results = [...visitors];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            results = results.filter(v =>
                v.FullName.toLowerCase().includes(lowerTerm) ||
                (v.VisitorType && v.VisitorType.toLowerCase().includes(lowerTerm)) ||
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

        if (filters.affiliation !== 'All') results = results.filter(v => v.VisitorType === filters.affiliation || v.AffiliationType === filters.affiliation);
        
        // Registration Date Filtering
        if (filters.regStart) results = results.filter(v => new Date(v.created_at) >= new Date(filters.regStart));
        if (filters.regEnd) {
            const endDate = new Date(filters.regEnd); endDate.setHours(23, 59, 59);
            results = results.filter(v => new Date(v.created_at) <= endDate);
        }
        
        // Visit Date Filtering
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
            else if (sortConfig.key === 'VisitorType') { aVal = (a.VisitorType || a.AffiliationType || '').toLowerCase(); bVal = (b.VisitorType || b.AffiliationType || '').toLowerCase(); }
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
        setCurrentPage(1);
    }, [searchTerm, filterType, filters, sortConfig, visitors]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredVisitors.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);

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
            setInputMode(null); setActionReason('');
        } catch (error) { alert('Action Failed. Please check network.'); }
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
        if (visitor.Status === 'Banned') return <StatusPill variant="banned">Banned</StatusPill>;
        if (!!visitor.IsWatchlisted) return <StatusPill variant="flagged">Flagged</StatusPill>;
        return <StatusPill variant="cleared">Cleared</StatusPill>;
    };

    const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => {
        setFilters({ affiliation: 'All', regStart: '', regEnd: '', visitStart: '', visitEnd: '' });
        setSearchTerm(''); setFilterType('all'); setSortConfig({ key: 'LastVisit', direction: 'desc' });
    };

    const uniqueAffiliations = [...new Set(visitors.map(v => v.VisitorType || v.AffiliationType || 'Visitor'))];
    const activeCount = visitors.filter(v => v.Status === 'Active' && !v.IsWatchlisted).length;
    const watchlistedCount = visitors.filter(v => Boolean(v.IsWatchlisted) && v.Status !== 'Banned').length;
    const bannedCount = visitors.filter(v => v.Status === 'Banned').length;

    const downloadCSV = () => {
        try {
            if (filteredVisitors.length === 0) return alert('No records to export.');

            let csvContent = "Visitor ID,Full Name,Classification,Clearance Status,Contact,Email,Registered Date\n";

            filteredVisitors.forEach(v => {
                const status = v.Status === 'Banned' ? 'Banned' : (v.IsWatchlisted ? 'Flagged' : 'Cleared');
                const type = v.VisitorType || v.AffiliationType || 'Visitor';
                const date = v.created_at ? new Date(v.created_at).toLocaleDateString('en-US') : 'N/A';
                
                const row = [
                    v.VisitorID || '-',
                    `"${(v.FullName || 'Unknown').replace(/"/g, '""')}"`,
                    `"${type}"`,
                    status,
                    `"${(v.ContactNumber || '').replace(/"/g, '""')}"`,
                    `"${(v.Email || '').replace(/"/g, '""')}"`,
                    date
                ].join(',');
                
                csvContent += row + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `ViSecure_Masterlist_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("CSV Export Error:", err);
            alert("Failed to export CSV. A background error occurred.");
        }
    };

    const downloadPDF = () => {
        try {
            if (filteredVisitors.length === 0) return alert('No records to export.');
            
            const doc = new jsPDF();
            
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text('ViSecure - Visitor Masterlist', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${filteredVisitors.length}`, 14, 28);

            const tableData = filteredVisitors.map(v => {
                const status = v.Status === 'Banned' ? 'Banned' : (v.IsWatchlisted ? 'Flagged' : 'Cleared');
                const type = v.VisitorType || v.AffiliationType || 'Visitor';
                const date = v.created_at ? new Date(v.created_at).toLocaleDateString('en-US') : 'N/A';
                
                return [
                    v.VisitorID?.toString() || '-', 
                    v.FullName || 'Unknown', 
                    type, 
                    status, 
                    date
                ];
            });

            autoTable(doc, {
                startY: 35,
                head: [['ID', 'Name', 'Classification', 'Status', 'Registered Date']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
                styles: { fontSize: 9 }
            });

            doc.save(`ViSecure_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to export PDF. A background error occurred.");
        }
    };

    const downloadVisitorProfilePDF = () => {
        try {
            if (!selectedVisitor) return alert("No visitor selected.");
            
            const doc = new jsPDF();
            let currentY = 20;

            // Header
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            doc.text('ViSecure Security Dossier', 14, currentY);
            currentY += 8;

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, currentY);
            currentY += 14;

            // Personal Data Section
            doc.setFontSize(11);
            doc.setTextColor(99, 102, 241);
            doc.text('PERSONAL DATA', 14, currentY);
            currentY += 6;

            const status = selectedVisitor.Status === 'Banned' ? 'BANNED' : (selectedVisitor.IsWatchlisted ? 'FLAGGED' : 'CLEARED');
            const type = selectedVisitor.VisitorType || selectedVisitor.AffiliationType || 'Visitor';

            autoTable(doc, {
                startY: currentY,
                head: [['Field', 'Information']],
                body: [
                    ['Visitor ID', `#${selectedVisitor.VisitorID || '-'}`],
                    ['Full Name', selectedVisitor.FullName || 'Unknown'],
                    ['Classification', type],
                    ['Clearance Status', status],
                    ['Age / Sex', `${selectedVisitor.Age || 'N/A'} / ${selectedVisitor.Sex || 'N/A'}`],
                    ['Contact Number', selectedVisitor.ContactNumber || 'N/A'],
                    ['Email', selectedVisitor.Email || 'N/A']
                ],
                theme: 'plain',
                styles: { cellPadding: 3, fontSize: 10, textColor: [51, 65, 85] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: [15, 23, 42] } },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 12;

            // Security Audit Trail Section
            const secLogs = selectedVisitor.security_logs || selectedVisitor.securityLogs || [];
            if (secLogs.length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(99, 102, 241);
                doc.text('SECURITY AUDIT TRAIL', 14, currentY);
                currentY += 6;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Date/Time', 'Action', 'Officer', 'Reason']],
                    body: secLogs.map(log => [
                        log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A',
                        (log.Action || 'UNKNOWN').replace(/_/g, ' '),
                        log.Officer || 'System',
                        log.Reason || '-'
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [220, 38, 38] }, // Red for security context
                    styles: { fontSize: 9 },
                    didDrawPage: (d) => { currentY = d.cursor.y; }
                });
                currentY += 12;
            }

            // Visit History Section
            const visits = selectedVisitor.logs || [];
            if (visits.length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(99, 102, 241);
                doc.text('VISIT HISTORY', 14, currentY);
                currentY += 6;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Date', 'Time In', 'Time Out', 'Purpose', 'Department']],
                    body: visits.map(log => [
                        log.EntryTimestamp ? new Date(log.EntryTimestamp).toLocaleDateString() : 'N/A',
                        log.EntryTimestamp ? new Date(log.EntryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                        log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE',
                        log.PurposeOfVisit || '-',
                        log.DepartmentToVisit || '-'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] }, // Slate color
                    styles: { fontSize: 9 },
                    didDrawPage: (d) => { currentY = d.cursor.y; }
                });
            }

            const safeName = (selectedVisitor.FullName || 'Visitor').replace(/\s+/g, '_');
            doc.save(`ViSecure_Dossier_${safeName}.pdf`);
        } catch (err) {
            console.error("Dossier Export Error:", err);
            alert("Failed to export Dossier. A background error occurred.");
        }
    };

    const secLogs = selectedVisitor ? (selectedVisitor.security_logs || selectedVisitor.securityLogs || []) : [];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
                .vml-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
                @keyframes vml-fade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
                .vml-fade { animation: vml-fade 0.2s ease; }
                .vml-row:hover { background: #f8fafc !important; }
                .vml-row:hover .vml-row-name { color: #4f46e5 !important; }
                .vml-export-btn:hover { background: #f8fafc !important; }
                .vml-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .vml-select:focus { border-color: #6366f1 !important; outline: none; }
                .vml-icon-btn:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
                .vml-pg-btn:not(:disabled):hover { background: #f1f5f9 !important; }
                .vml-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); }
            `}</style>

            <div className="vml-root" style={{ color: '#0f172a' }}>

                {/* PAGE HEADER */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Visitor Master Records</h1>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                        {filteredVisitors.length} of {visitors.length} records
                    </p>
                </div>

                {/* TOOLBAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>

                    {/* Left: search + buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search name, ID, contact..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="vml-input"
                                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, width: 260, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', color: '#0f172a', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="vml-icon-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: '1px solid #e2e8f0', background: showFilters ? '#f1f5f9' : '#fff', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            Filters
                        </button>

                        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />

                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="vml-icon-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: '1px solid #e2e8f0', background: showExportMenu ? '#f1f5f9' : '#fff', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Export
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {showExportMenu && (
                                <div className="vml-fade" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, minWidth: 180, overflow: 'hidden' }}>
                                    <button className="vml-export-btn" onClick={() => { downloadCSV(); setShowExportMenu(false); }} style={{ width: '100%', padding: '11px 15px', textAlign: 'left', background: '#fff', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                                        Full List (CSV)
                                    </button>
                                    <button className="vml-export-btn" onClick={() => { downloadPDF(); setShowExportMenu(false); }} style={{ width: '100%', padding: '11px 15px', textAlign: 'left', background: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                                        Summary (PDF)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: filter chips */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <FilterChip label="All Records" count={visitors.length} active={filterType === 'all'} onClick={() => setFilterType('all')} />
                        <FilterChip label="Cleared" count={activeCount} active={filterType === 'active'} variant="cleared" onClick={() => setFilterType('active')} />
                        <FilterChip label="Flagged" count={watchlistedCount} active={filterType === 'watchlisted'} variant="flagged" onClick={() => setFilterType('watchlisted')} />
                        <FilterChip label="Banned" count={bannedCount} active={filterType === 'banned'} variant="banned" onClick={() => setFilterType('banned')} />
                    </div>
                </div>

                {/* FILTER PANEL */}
                {showFilters && (
                    <div className="vml-fade" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <FilterGroup label="Clearance Status">
                            <select className="vml-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                                <option value="all">All Statuses</option>
                                <option value="active">Cleared</option>
                                <option value="watchlisted">Flagged</option>
                                <option value="banned">Banned</option>
                            </select>
                        </FilterGroup>

                        <FilterGroup label="Sort By">
                            <select className="vml-select" value={`${sortConfig.key}|${sortConfig.direction}`} onChange={handleAdvancedSortChange} style={selectStyle}>
                                <option value="LastVisit|desc">Last Visit (Newest)</option>
                                <option value="LastVisit|asc">Last Visit (Oldest)</option>
                                <option value="created_at|desc">First Registered (Newest)</option>
                                <option value="created_at|asc">First Registered (Oldest)</option>
                                <option value="FullName|asc">Name (A-Z)</option>
                                <option value="FullName|desc">Name (Z-A)</option>
                            </select>
                        </FilterGroup>

                        <FilterGroup label="Classification">
                            <select className="vml-select" value={filters.affiliation} onChange={(e) => handleFilterChange('affiliation', e.target.value)} style={selectStyle}>
                                <option value="All">All Types</option>
                                {uniqueAffiliations.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </FilterGroup>

                        <FilterGroup label="Registration Date">
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="date" value={filters.regStart} onChange={(e) => handleFilterChange('regStart', e.target.value)} className="vml-input" style={{ ...dateInputStyle }} />
                                <input type="date" value={filters.regEnd} onChange={(e) => handleFilterChange('regEnd', e.target.value)} className="vml-input" style={{ ...dateInputStyle }} />
                            </div>
                        </FilterGroup>

                        {/* NEW: Visit Date Filter Group */}
                        <FilterGroup label="Visit Date">
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="date" value={filters.visitStart} onChange={(e) => handleFilterChange('visitStart', e.target.value)} className="vml-input" style={{ ...dateInputStyle }} />
                                <input type="date" value={filters.visitEnd} onChange={(e) => handleFilterChange('visitEnd', e.target.value)} className="vml-input" style={{ ...dateInputStyle }} />
                            </div>
                        </FilterGroup>

                        <button onClick={clearFilters} style={{ padding: '8px 14px', background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                            Reset All
                        </button>
                    </div>
                )}

                {/* TABLE */}
                {loading ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading records...</div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <SortableHeader label="Visitor Identity" sortKey="FullName" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Classification" sortKey="VisitorType" sortConfig={sortConfig} onSort={requestSort} />
                                        <th style={thStyle}>Clearance</th>
                                        <SortableHeader label="First Registered" sortKey="created_at" sortConfig={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Last Visit" sortKey="LastVisit" sortConfig={sortConfig} onSort={requestSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length > 0 ? currentItems.map((visitor) => {
                                        const lastLog = visitor.logs && visitor.logs.length > 0
                                            ? [...visitor.logs].sort((a, b) => new Date(b.EntryTimestamp) - new Date(a.EntryTimestamp))[0]
                                            : null;
                                        const displayClassification = visitor.VisitorType || visitor.AffiliationType || 'Visitor';

                                        return (
                                            <tr
                                                key={visitor.VisitorID}
                                                className="vml-row"
                                                onClick={() => handleRowClick(visitor)}
                                                title="Click to view full security profile"
                                                style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: '#fff', transition: 'background 0.1s' }}
                                            >
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                            {(visitor.FirstName && visitor.FirstName[0])}{(visitor.Surname && visitor.Surname[0])}
                                                        </div>
                                                        <div>
                                                            <div className="vml-row-name" style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5, transition: 'color 0.15s' }}>{visitor.FullName}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, fontFamily: 'DM Mono, monospace' }}>#{visitor.VisitorID}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{displayClassification}</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    {getStatusBadge(visitor)}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: 13, color: '#334155' }}>
                                                        {new Date(visitor.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    {lastLog ? (
                                                        <div>
                                                            <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                                                {new Date(lastLog.EntryTimestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
                                                                {new Date(lastLog.EntryTimestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>No visits yet</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                                No records match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PAGINATION */}
                {filteredVisitors.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12, color: '#64748b' }}>
                        <span>
                            Showing <strong style={{ color: '#0f172a' }}>{indexOfFirstItem + 1}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(indexOfLastItem, filteredVisitors.length)}</strong> of <strong style={{ color: '#0f172a' }}>{filteredVisitors.length}</strong> entries
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="vml-select"
                                style={{ ...selectStyle, minWidth: 'unset', padding: '6px 10px', fontSize: 12 }}
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                            <button
                                className="vml-pg-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#475569', fontWeight: 500, fontSize: 12, fontFamily: 'inherit', transition: 'background 0.1s' }}
                            >
                                Previous
                            </button>
                            <span style={{ padding: '0 8px', fontWeight: 600, color: '#334155', fontSize: 12 }}>
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                className="vml-pg-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : '#475569', fontWeight: 500, fontSize: 12, fontFamily: 'inherit', transition: 'background 0.1s' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="vml-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="vml-fade" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 900, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.16)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>

                        {/* Modal Header */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                Visitor Security Profile
                            </span>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1, padding: 4 }}>&times;</button>
                        </div>

                        {historyLoading || !selectedVisitor ? (
                            <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading profile...</div>
                        ) : (
                            <div style={{ display: 'flex', gap: 0, flex: 1 }}>

                                {/* LEFT PANEL */}
                                <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid #f1f5f9', padding: '22px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                                            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                                                {selectedVisitor.FullName?.[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{selectedVisitor.FullName}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
                                                    #{selectedVisitor.VisitorID} · {selectedVisitor.VisitorType || selectedVisitor.AffiliationType || 'Visitor'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={downloadVisitorProfilePDF} style={{ width: '100%', padding: '9px 14px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 9, fontWeight: 600, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                        Download Security Dossier
                                    </button>

                                    <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px', fontSize: 12 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Personal Data</div>
                                        {[
                                            ['Age', selectedVisitor.Age],
                                            ['Sex', selectedVisitor.Sex],
                                            ['Phone', selectedVisitor.ContactNumber],
                                            ['Email', selectedVisitor.Email],
                                        ].map(([label, val]) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                                                <span style={{ color: '#334155', fontWeight: 500, textAlign: 'right', maxWidth: 140, wordBreak: 'break-word' }}>{val || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Global Status Control</div>

                                        {(inputMode === 'watchlist' || inputMode === 'ban') ? (
                                            <div className="vml-fade">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={actionReason}
                                                    onChange={(e) => setActionReason(e.target.value)}
                                                    placeholder={`Reason for ${inputMode}...`}
                                                    className="vml-input"
                                                    style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1.5px solid ${inputMode === 'ban' ? '#f87171' : '#fbbf24'}`, fontSize: 12, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none' }}
                                                />
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                                    <button onClick={() => setInputMode(null)} style={{ ...modalGhostBtn }}>Cancel</button>
                                                    <button onClick={() => handleGlobalClearance(inputMode === 'ban' ? 'Banned' : 'Watchlisted')} style={{ ...modalSolidBtn, background: inputMode === 'ban' ? '#dc2626' : '#d97706' }}>Confirm</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {selectedVisitor.Status === 'Banned' ? (
                                                    <button onClick={() => handleGlobalClearance('Cleared')} style={{ ...modalSolidBtn, background: '#10b981', gridColumn: '1/-1' }}>
                                                        Unban User
                                                    </button>
                                                ) : selectedVisitor.IsWatchlisted == 1 ? (
                                                    <>
                                                        <button onClick={() => handleGlobalClearance('Cleared')} style={{ ...modalSolidBtn, background: '#10b981' }}>Remove Flag</button>
                                                        <button onClick={() => setInputMode('ban')} style={{ ...modalSolidBtn, background: '#dc2626' }}>Ban User</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setInputMode('watchlist')} style={{ ...modalOutlineBtn, color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }}>Global Flag</button>
                                                        <button onClick={() => setInputMode('ban')} style={{ ...modalOutlineBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fff5f5' }}>Ban User</button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT PANEL */}
                                <div style={{ flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                                    {/* Security Audit Trail */}
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Security Audit Trail</div>
                                        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: '12px 14px' }}>
                                            {secLogs.length > 0 ? (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {secLogs.map(log => {
                                                        const isDanger = log.Action.includes('BAN') || log.Action.includes('FLAG') || log.Action.includes('OVERSTAY');
                                                        return (
                                                            <li key={log.id} style={{ borderLeft: `2px solid ${isDanger ? '#ef4444' : '#10b981'}`, paddingLeft: 12 }}>
                                                                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>
                                                                    {new Date(log.created_at).toLocaleString()} · {log.Officer}
                                                                </div>
                                                                <div style={{ fontSize: 12, fontWeight: 700, color: isDanger ? '#b91c1c' : '#065f46' }}>
                                                                    {log.Action.replace(/_/g, ' ')}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#475569' }}>Reason: {log.Reason}</div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: 13, margin: 0 }}>No security incidents recorded.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visit History */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Visit History</div>
                                        <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        {['Date', 'Entry / Exit', 'Purpose', 'Department', 'Host'].map(h => (
                                                            <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedVisitor.logs && selectedVisitor.logs.length > 0 ? selectedVisitor.logs.map(log => (
                                                        <tr key={log.LogID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '9px 10px', color: '#334155' }}>{new Date(log.EntryTimestamp).toLocaleDateString()}</td>
                                                            <td style={{ padding: '9px 10px' }}>
                                                                <div style={{ color: '#059669', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                                                                    In {new Date(log.EntryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                {log.ExitTimestamp ? (
                                                                    <div style={{ color: '#dc2626', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                                                                        Out {new Date(log.ExitTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4, fontWeight: 700, display: 'inline-block', marginTop: 2 }}>ACTIVE</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '9px 10px', color: '#475569' }}>
                                                                {log.PurposeOfVisit}
                                                                {/* BUG FIXED HERE */}
                                                                {log.IsFlagged == 1 ? <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700, marginTop: 2 }}>SUSPICIOUS</div> : null}
                                                            </td>
                                                            <td style={{ padding: '9px 10px', color: '#475569' }}>{log.DepartmentToVisit || '-'}</td>
                                                            <td style={{ padding: '9px 10px', color: '#475569' }}>{log.PersonToVisit || '-'}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="5" style={{ padding: '24px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>No visit history found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// Sub-components

function StatusPill({ variant, children }) {
    const map = {
        banned:  { bg: '#fff5f5', color: '#b91c1c', ring: '#fecaca' },
        flagged: { bg: '#fffbeb', color: '#92400e', ring: '#fde68a' },
        cleared: { bg: '#f0fdf4', color: '#166534', ring: '#bbf7d0' },
    };
    const s = map[variant] || map.cleared;
    return (
        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.ring}` }}>
            {children}
        </span>
    );
}

function FilterChip({ label, count, active, variant, onClick }) {
    const map = {
        cleared: { idle: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }, active: { bg: '#16a34a', color: '#fff', border: '#16a34a' } },
        flagged: { idle: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' }, active: { bg: '#d97706', color: '#fff', border: '#d97706' } },
        banned:  { idle: { bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' }, active: { bg: '#dc2626', color: '#fff', border: '#dc2626' } },
        default: { idle: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }, active: { bg: '#0f172a', color: '#fff', border: '#0f172a' } },
    };
    const s = (map[variant] || map.default)[active ? 'active' : 'idle'];
    return (
        <button onClick={onClick} style={{ padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
            {label} <span style={{ opacity: 0.75, fontSize: 11, marginLeft: 2 }}>({count})</span>
        </button>
    );
}

function FilterGroup({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
            {children}
        </div>
    );
}

function SortableHeader({ label, sortKey, sortConfig, onSort }) {
    const isActive = sortConfig.key === sortKey;
    return (
        <th onClick={() => onSort(sortKey)} style={{ ...thStyle, cursor: 'pointer', background: isActive ? '#f1f5f9' : '#f8fafc', color: isActive ? '#334155' : '#94a3b8', userSelect: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {label}
                <span style={{ fontSize: 10, fontWeight: 700, opacity: isActive ? 1 : 0.4 }}>
                    {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
                </span>
            </span>
        </th>
    );
}

// Shared styles
const thStyle = {
    textAlign: 'left', padding: '10px 16px',
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    letterSpacing: '0.07em', textTransform: 'uppercase',
    borderBottom: '1px solid #f1f5f9', background: '#f8fafc',
};

const tdStyle = {
    padding: '13px 16px', verticalAlign: 'middle',
};

const selectStyle = {
    padding: '8px 11px', borderRadius: 8, border: '1px solid #e2e8f0',
    background: '#fff', fontSize: 13, color: '#334155',
    fontFamily: 'inherit', cursor: 'pointer', minWidth: 160,
    outline: 'none', transition: 'border-color 0.15s',
};

const dateInputStyle = {
    padding: '8px 11px', borderRadius: 8, border: '1px solid #e2e8f0',
    background: '#fff', fontSize: 13, color: '#334155',
    fontFamily: 'inherit', outline: 'none',
};

const baseModalBtn = {
    padding: '8px 12px', borderRadius: 8, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
    border: 'none', transition: 'opacity 0.15s',
};

const modalSolidBtn   = { ...baseModalBtn, color: '#fff' };
const modalGhostBtn   = { ...baseModalBtn, background: '#fff', border: '1px solid #e2e8f0', color: '#475569' };
const modalOutlineBtn = { ...baseModalBtn, border: '1px solid' };