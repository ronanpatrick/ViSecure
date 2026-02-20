import { useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';

// ✅ IMPORT YOUR NEW COMPONENTS
import LiveDashboard from './LiveDashboard';  // The new Command Center
import VisitorMasterList from './VisitorMasterList'; 
import AnalyticsDashboard from './AnalyticsDashboard'; // 👈 This is imported, now let's use it!

export default function AdminDashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/login');
    };

    return (
        <div style={dashboardWrapperStyle}>
            
            {/* SIDEBAR */}
            <div style={sidebarStyle}>
                <div style={sidebarHeaderStyle}>
                    <div style={{fontSize: '24px'}}>🛡️</div>
                    <div>ViSecure Admin</div>
                </div>

                <nav style={navStyle}>
                    {/* 🆕 Using NavLink instead of buttons */}
                    <NavLink to="/admin/monitoring" style={({ isActive }) => isActive ? activeTabStyle : tabStyle}>
                        Live Dashboard
                    </NavLink>
                    <NavLink to="/admin/records" style={({ isActive }) => isActive ? activeTabStyle : tabStyle}>
                        Visitor Records
                    </NavLink>
                    <NavLink to="/admin/analytics" style={({ isActive }) => isActive ? activeTabStyle : tabStyle}>
                        Analytics & Reports
                    </NavLink>
                </nav>

                <button onClick={handleLogout} style={logoutBtnStyle}>Sign Out</button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={mainContentStyle}>
                {/* 🛡️ THE OUTLET: This is where Monitoring/Records/Analytics will appear! */}
                <Outlet />
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