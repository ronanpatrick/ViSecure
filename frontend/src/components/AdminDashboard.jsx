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
        <div className="flex h-screen bg-slate-50 font-sans">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-blue-700 text-white flex flex-col shadow-sm">
                <div className="mb-10 flex items-center gap-3 text-xl font-bold text-white pb-6 border-b border-blue-600 px-5 pt-6">
                    <div className="text-2xl">🛡️</div>
                    <div>Admin Dashboard</div>
                </div>

                <nav className="flex flex-col gap-1 flex-1 px-3">
                    {/* 🆕 Using NavLink instead of buttons */}
                    <NavLink 
                        to="/admin/monitoring" 
                        className={({ isActive }) => 
                            isActive 
                                ? "px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold transition-colors" 
                                : "px-4 py-3 bg-transparent text-blue-100 hover:text-white hover:bg-blue-600/50 rounded-md text-sm font-medium transition-colors"
                        }
                    >
                        Live Monitoring
                    </NavLink>
                    <NavLink 
                        to="/admin/records" 
                        className={({ isActive }) => 
                            isActive 
                                ? "px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold transition-colors" 
                                : "px-4 py-3 bg-transparent text-blue-100 hover:text-white hover:bg-blue-600/50 rounded-md text-sm font-medium transition-colors"
                        }
                    >
                        Visitor Records
                    </NavLink>
                    <NavLink 
                        to="/admin/analytics" 
                        className={({ isActive }) => 
                            isActive 
                                ? "px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold transition-colors" 
                                : "px-4 py-3 bg-transparent text-blue-100 hover:text-white hover:bg-blue-600/50 rounded-md text-sm font-medium transition-colors"
                        }
                    >
                        Analytics & Reports
                    </NavLink>
                </nav>

                <button 
                    onClick={handleLogout} 
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-md cursor-pointer font-semibold mt-auto mb-4 mx-3 transition-colors"
                >
                    Sign Out
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-8 overflow-y-auto">
                {/* 🛡️ THE OUTLET: This is where Monitoring/Records/Analytics will appear! */}
                <Outlet />
            </div>

        </div>
    );
}
