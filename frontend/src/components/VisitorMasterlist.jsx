import { useEffect, useState } from 'react';
import axios from 'axios';

export default function VisitorMasterList() {
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // MODAL STATE
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // 1. Fetch Data
    useEffect(() => {
        fetchVisitors();
    }, []);

    // 2. Filter Logic
    useEffect(() => {
        const results = visitors.filter(visitor => 
            visitor.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (visitor.AffiliationType && visitor.AffiliationType.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredVisitors(results);
    }, [searchTerm, visitors]);

    const fetchVisitors = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/all-visitors`);
            setVisitors(response.data);
            setFilteredVisitors(response.data); 
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    const toggleBanStatus = async (e, id) => {
        e.stopPropagation(); // Prevent row click when clicking button
        if(!window.confirm("Are you sure you want to change this visitor's status?")) return;
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/admin/visitors/${id}/status`);
            fetchVisitors(); 
            if(selectedVisitor && selectedVisitor.VisitorID === id) setShowModal(false); // Close modal if open
        } catch (error) {
            alert("Failed to update status.");
        }
    };

    // 3. HANDLE ROW CLICK
    const handleRowClick = async (visitor) => {
        setShowModal(true);
        setHistoryLoading(true);
        try {
            // Fetch full details + history
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visitors/${visitor.VisitorID}`);
            setSelectedVisitor(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const downloadCSV = () => {
        // Define all the columns you want in Excel
        const headers = [
            "Visitor ID", 
            "Full Name", 
            "Affiliation", 
            "Sex", 
            "Age", 
            "Current Status", 
            "Visit Date",       // 👈 New Column
            "Time In",          // 👈 New Column
            "Time Out",         // 👈 New Column
            "Purpose",          // 👈 New Column
            "Department"        // 👈 New Column
        ];
        
        const rows = [];

        filteredVisitors.forEach(visitor => {
            // Check if this visitor has history
            if (visitor.logs && visitor.logs.length > 0) {
                // LOOP: Create one row for EACH visit
                visitor.logs.forEach(log => {
                    rows.push([
                        visitor.VisitorID,
                        `"${visitor.FullName}"`, // Quote names to handle commas
                        visitor.AffiliationType || "Visitor",
                        visitor.Sex,
                        visitor.Age,
                        visitor.Status,
                        // --- VISIT DETAILS ---
                        new Date(log.EntryTimestamp).toLocaleDateString(),
                        new Date(log.EntryTimestamp).toLocaleTimeString(),
                        log.ExitTimestamp ? new Date(log.ExitTimestamp).toLocaleTimeString() : "Still Inside",
                        `"${log.PurposeOfVisit}"`,
                        log.DepartmentToVisit || "-"
                    ].join(","));
                });
            } else {
                // If they have NO history, still add them (with empty visit columns)
                rows.push([
                    visitor.VisitorID,
                    `"${visitor.FullName}"`,
                    visitor.AffiliationType || "Visitor",
                    visitor.Sex,
                    visitor.Age,
                    visitor.Status,
                    "-", "-", "-", "-", "-" // Empty columns
                ].join(","));
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

    // --- STYLES ---
    const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
    const searchInputStyle = { padding: '10px', width: '300px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' };
    const exportBtnStyle = { backgroundColor: '#0e9f6e', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };
    
    const tableWrapperStyle = { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e5e7eb' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
    const thStyle = { backgroundColor: '#f9fafb', color: '#374151', padding: '16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e5e7eb' };
    const tdStyle = { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#4b5563' };
    const rowStyle = { cursor: 'pointer', transition: 'background 0.1s' };
    const activeBadgeStyle = { backgroundColor: '#def7ec', color: '#03543f', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
    const actionBtnStyle = { padding: '6px 12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' };

    // Modal Styles
    const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
    const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '800px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' };
    const closeBtnStyle = { alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' };

    return (
        <div className="fade-in">
            <div style={topBarStyle}>
                <h2 style={{ fontSize: '24px', margin: 0, color: '#1a1c23' }}>📂 Visitor Master Records</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search by name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={searchInputStyle}
                    />
                    <button onClick={downloadCSV} style={exportBtnStyle}>📥 Export CSV</button>
                </div>
            </div>
            
            {loading ? <p>Loading records...</p> : (
                <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Full Name</th>
                                <th style={thStyle}>Affiliation</th>
                                <th style={thStyle}>Reg. Date</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVisitors.map((visitor) => (
                                <tr 
                                    key={visitor.VisitorID} 
                                    style={rowStyle} 
                                    onClick={() => handleRowClick(visitor)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    <td style={tdStyle}>{visitor.VisitorID}</td>
                                    <td style={tdStyle}><strong>{visitor.FullName}</strong></td>
                                    <td style={tdStyle}>{visitor.AffiliationType || 'Visitor'}</td>
                                    <td style={tdStyle}>{new Date(visitor.created_at).toLocaleDateString()}</td>
                                    <td style={tdStyle}>
                                        {visitor.Status === 'Banned' ? 
                                            <span style={{...activeBadgeStyle, backgroundColor: '#fee2e2', color: '#991b1b'}}>🚫 Banned</span> : 
                                            <span style={activeBadgeStyle}>✅ Active</span>
                                        }
                                    </td>
                                    <td style={tdStyle}>
                                        <button 
                                            onClick={(e) => toggleBanStatus(e, visitor.VisitorID)}
                                            style={{...actionBtnStyle, backgroundColor: visitor.Status === 'Banned' ? '#6b7280' : '#ef4444'}}
                                        >
                                            {visitor.Status === 'Banned' ? 'Unban' : 'Ban'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* VISITOR DETAILS MODAL */}
            {showModal && (
                <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <button style={closeBtnStyle} onClick={() => setShowModal(false)}>&times;</button>
                        
                        {historyLoading || !selectedVisitor ? <p>Loading details...</p> : (
                            <div style={{ display: 'flex', gap: '30px' }}>
                                {/* LEFT: PROFILE INFO */}
                                <div style={{ flex: 1, borderRight: '1px solid #e5e7eb', paddingRight: '20px' }}>
                                    <h2 style={{ marginTop: 0, color: '#111827' }}>{selectedVisitor.FullName}</h2>
                                    <p style={{ color: '#6b7280', fontSize: '14px' }}>Visitor ID: #{selectedVisitor.VisitorID}</p>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                                        <div><strong>Type:</strong> {selectedVisitor.AffiliationType}</div>
                                        <div><strong>Sex:</strong> {selectedVisitor.Sex}</div>
                                        <div><strong>Age:</strong> {selectedVisitor.Age}</div>
                                        <div><strong>Phone:</strong> {selectedVisitor.ContactNumber || 'N/A'}</div>
                                        <div><strong>Status:</strong> {selectedVisitor.Status}</div>
                                    </div>
                                </div>

                                {/* RIGHT: VISIT HISTORY */}
                                <div style={{ flex: 2 }}>
                                    <h3 style={{ marginTop: 0, color: '#374151' }}>🕒 Visit History</h3>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb' }}>
                                                <tr>
                                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>In / Out</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Purpose</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Dept</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVisitor.logs && selectedVisitor.logs.length > 0 ? (
                                                    selectedVisitor.logs.map(log => (
                                                        <tr key={log.LogID || log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                            <td style={{ padding: '10px' }}>{new Date(log.EntryTimestamp).toLocaleDateString()}</td>
                                                            <td style={{ padding: '10px' }}>
                                                                <div style={{ color: 'green' }}>⬇ {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                                {log.ExitTimestamp ? 
                                                                    <div style={{ color: 'red' }}>⬆ {new Date(log.ExitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div> : 
                                                                    <span style={{ fontSize: '11px', background: '#e0f2fe', padding: '2px 5px', borderRadius: '4px' }}>ACTIVE</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: '10px' }}>{log.PurposeOfVisit}</td>
                                                            <td style={{ padding: '10px' }}>{log.DepartmentToVisit || '-'}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No history found.</td></tr>
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