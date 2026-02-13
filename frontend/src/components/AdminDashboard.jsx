import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ IMPORT YOUR NEW COMPONENTS
import LiveDashboard from './LiveDashboard';  // The new Command Center
import VisitorMasterList from './VisitorMasterList'; 

// ❌ DELETED: import VisitorLogs ... (Replaced by LiveDashboard)
// ❌ DELETED: import CheckoutScanner ... (We removed this feature)

export default function AdminDashboard() {
    // Default to 'MONITORING' so you see the cool dashboard first
    const [currentView, setCurrentView] = useState('MONITORING'); 
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/login');
    };

    // --- MAIN RENDER ---
    return (
        <div style={dashboardWrapperStyle}>
            
            {/* SIDEBAR */}
            <div style={sidebarStyle}>
                <div style={sidebarHeaderStyle}>
                    <div style={{fontSize: '24px'}}>🛡️</div>
                    <div>ViSecure Admin</div>
                </div>

                <nav style={navStyle}>
                    <button onClick={() => setCurrentView('MONITORING')} style={currentView === 'MONITORING' ? activeTabStyle : tabStyle}>
                        Live Dashboard
                    </button>
                    <button onClick={() => setCurrentView('RECORDS')} style={currentView === 'RECORDS' ? activeTabStyle : tabStyle}>
                        Visitor Records
                    </button>
                    <button onClick={() => setCurrentView('ANALYTICS')} style={currentView === 'ANALYTICS' ? activeTabStyle : tabStyle}>
                        Analytics & Reports
                    </button>
                </nav>

                <button onClick={handleLogout} style={logoutBtnStyle}>Sign Out</button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={mainContentStyle}>
                
                {/* VIEW 1: LIVE DASHBOARD (Command Center) */}
                {currentView === 'MONITORING' && <LiveDashboard />}

                {/* VIEW 2: RECORDS (Masterlist) */}
                {currentView === 'RECORDS' && <VisitorMasterList />}

                {/* VIEW 3: ANALYTICS (Placeholder) */}
                {currentView === 'ANALYTICS' && <h2>📊 Analytics & Reports (Coming Soon)</h2>}
            </div>

        </div>
    );
}

// --- DASHBOARD LAYOUT STYLES ---
const dashboardWrapperStyle = { display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Inter', sans-serif" };
const sidebarStyle = { width: '260px', backgroundColor: '#1a1c23', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px' };
const sidebarHeaderStyle = { marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold', color: '#fff', paddingBottom: '20px', borderBottom: '1px solid #2f333d' };
const navStyle = { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 };
const tabStyle = { padding: '12px 15px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const activeTabStyle = { ...tabStyle, backgroundColor: '#007bff', color: 'white', fontWeight: '600' };
const logoutBtnStyle = { padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: 'auto', fontWeight: 'bold' };
const mainContentStyle = { flex: 1, padding: '30px', overflowY: 'auto' };