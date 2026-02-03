import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import VisitorLogs from './VisitorLogs'; 
import CheckoutScanner from './CheckoutScanner';

export default function AdminDashboard() {
    // Default view
    const [currentView, setCurrentView] = useState('RECORDS'); 
    
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const navigate = useNavigate();

    // 1. Fetch data
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

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/login');
    };

    // --- SUB-COMPONENTS (THE VIEWS) ---

    // VIEW 1: VISITOR RECORDS
    const renderVisitorRecords = () => (
        <div style={viewContainerStyle}>
            <h2 style={viewTitleStyle}>📂 Visitor Master Records</h2>
            {loading ? <p>Loading records...</p> : (
                <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Full Name</th>
                                <th style={thStyle}>Affiliation</th>
                                <th style={thStyle}>Registration Date</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.map((visitor) => (
                                <tr key={visitor.VisitorID} style={trStyle}>
                                    <td style={tdStyle}>{visitor.VisitorID}</td>
                                    <td style={tdStyle}><strong>{visitor.FullName}</strong></td>
                                    <td style={tdStyle}>{visitor.AffiliationType || 'Visitor'}</td>
                                    <td style={tdStyle}>{new Date(visitor.created_at).toLocaleDateString()}</td>
                                    <td style={tdStyle}>
                                        <span style={activeBadgeStyle}>Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // VIEW 2: LIVE MONITORING
    const renderLiveMonitoring = () => (
        <div style={viewContainerStyle}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={viewTitleStyle}>📡 Live Traffic Monitoring</h2>
                <button onClick={() => setShowScanner(true)} style={actionBtnStyle}>
                    📷 Manual Exit Scan
                </button>
            </div>
            <VisitorLogs />
        </div>
    );

    // VIEW 3: ANALYTICS (Placeholder)
    const renderAnalytics = () => (
        <div style={viewContainerStyle}>
            <h2 style={viewTitleStyle}>📊 Analytics & Reports</h2>
            <div style={placeholderBoxStyle}>
                <p>Statistical graphs and data export tools will appear here.</p>
            </div>
        </div>
    );

    // VIEW 4: ALERTS (Placeholder)
    const renderAlerts = () => (
        <div style={viewContainerStyle}>
            <h2 style={viewTitleStyle}>🚨 Alert Management</h2>
            <div style={placeholderBoxStyle}>
                <p>Security Watchlist and Ban Management controls will appear here.</p>
                <button style={{...actionBtnStyle, backgroundColor: '#dc3545', marginTop: '10px'}}>
                    + Add to Watchlist
                </button>
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    return (
        <div style={dashboardWrapperStyle}>
            
            {/* SIDEBAR NAVIGATION */}
            <div style={sidebarStyle}>
                <div style={sidebarHeaderStyle}>
                    <div style={{fontSize: '24px'}}>🛡️</div>
                    <div>ViSecure Admin</div>
                </div>

                <nav style={navStyle}>
                    <button 
                        onClick={() => setCurrentView('RECORDS')} 
                        style={currentView === 'RECORDS' ? activeTabStyle : tabStyle}
                    >
                        Visitor Records
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('MONITORING')} 
                        style={currentView === 'MONITORING' ? activeTabStyle : tabStyle}
                    >
                        Live Monitoring
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('ANALYTICS')} 
                        style={currentView === 'ANALYTICS' ? activeTabStyle : tabStyle}
                    >
                        Analytics and Reports
                    </button>
                    
                    <button 
                        onClick={() => setCurrentView('ALERTS')} 
                        style={currentView === 'ALERTS' ? activeTabStyle : tabStyle}
                    >
                        Alert Managements
                    </button>
                </nav>

                <button onClick={handleLogout} style={logoutBtnStyle}>
                    Sign Out
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={mainContentStyle}>
                {currentView === 'RECORDS' && renderVisitorRecords()}
                {currentView === 'MONITORING' && renderLiveMonitoring()}
                {currentView === 'ANALYTICS' && renderAnalytics()}
                {currentView === 'ALERTS' && renderAlerts()}
            </div>

            {/* MODAL */}
            {showScanner && (
                <CheckoutScanner 
                    onClose={() => setShowScanner(false)}
                    onSuccess={() => { setShowScanner(false); fetchVisitors(); }}
                />
            )}
        </div>
    );
}

// --- PROFESSIONAL STYLES ---
const dashboardWrapperStyle = {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
};

// Sidebar
const sidebarStyle = {
    width: '260px',
    backgroundColor: '#1a1c23', // Dark professional sidebar
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
};

const sidebarHeaderStyle = {
    marginBottom: '40px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    paddingBottom: '20px',
    borderBottom: '1px solid #2f333d'
};

const navStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: 1
};

const tabStyle = {
    padding: '12px 15px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    fontWeight: '500'
};

const activeTabStyle = {
    ...tabStyle,
    backgroundColor: '#007bff', // Corporate Blue
    color: 'white',
    fontWeight: '600'
};

const logoutBtnStyle = {
    padding: '12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: 'auto',
    fontWeight: 'bold'
};

// Main Content
const mainContentStyle = {
    flex: 1,
    padding: '30px',
    overflowY: 'auto'
};

const viewContainerStyle = {
    animation: 'fadeIn 0.3s ease-in-out'
};

const viewTitleStyle = {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#1a1c23'
};

// Tables & Elements
const tableWrapperStyle = {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
};

const thStyle = {
    backgroundColor: '#f9fafb',
    color: '#374151',
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '1px solid #e5e7eb'
};

const tdStyle = {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    color: '#4b5563'
};

const trStyle = {
    backgroundColor: 'white'
};

const activeBadgeStyle = {
    backgroundColor: '#def7ec',
    color: '#03543f',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
};

const actionBtnStyle = {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
};

const placeholderBoxStyle = {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    textAlign: 'center',
    color: '#6b7280',
    border: '1px dashed #d1d5db'
};