import { useEffect, useState } from 'react';
import axios from 'axios';

export default function VisitorMasterList() {
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Data
    useEffect(() => {
        fetchVisitors();
    }, []);

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

    // 2. Ban Logic
    const toggleBanStatus = async (id) => {
        if(!window.confirm("Are you sure you want to change this visitor's status?")) return;

        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/admin/visitors/${id}/status`);
            fetchVisitors(); // Refresh list to show new status
        } catch (error) {
            alert("Failed to update status.");
        }
    };

    // 3. Render
    return (
        <div className="fade-in">
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#1a1c23' }}>📂 Visitor Master Records</h2>
            
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
                            {visitors.map((visitor) => (
                                <tr key={visitor.VisitorID} style={trStyle}>
                                    <td style={tdStyle}>{visitor.VisitorID}</td>
                                    <td style={tdStyle}><strong>{visitor.FullName}</strong></td>
                                    <td style={tdStyle}>{visitor.AffiliationType || 'Visitor'}</td>
                                    <td style={tdStyle}>{new Date(visitor.created_at).toLocaleDateString()}</td>
                                    
                                    {/* STATUS BADGE */}
                                    <td style={tdStyle}>
                                        {visitor.Status === 'Banned' ? (
                                            <span style={{...activeBadgeStyle, backgroundColor: '#fee2e2', color: '#991b1b'}}>
                                                🚫 Banned
                                            </span>
                                        ) : (
                                            <span style={activeBadgeStyle}>
                                                ✅ Active
                                            </span>
                                        )}
                                    </td>

                                    {/* BAN BUTTON */}
                                    <td style={tdStyle}>
                                        <button 
                                            onClick={() => toggleBanStatus(visitor.VisitorID)}
                                            style={{
                                                ...actionBtnStyle, 
                                                backgroundColor: visitor.Status === 'Banned' ? '#6b7280' : '#ef4444',
                                            }}
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
        </div>
    );
}

// --- STYLES (Kept local to this component) ---
const tableWrapperStyle = { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e5e7eb' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle = { backgroundColor: '#f9fafb', color: '#374151', padding: '16px', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#4b5563' };
const trStyle = { backgroundColor: 'white' };
const activeBadgeStyle = { backgroundColor: '#def7ec', color: '#03543f', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
const actionBtnStyle = { padding: '6px 12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' };