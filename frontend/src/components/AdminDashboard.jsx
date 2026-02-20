import { useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';

import LiveDashboard from './LiveDashboard';
import VisitorMasterList from './VisitorMasterList';
import AnalyticsDashboard from './AnalyticsDashboard';

const NAV_ITEMS = [
    {
        to: '/admin/monitoring',
        label: 'Live Monitoring',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        to: '/admin/records',
        label: 'Visitor Records',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        to: '/admin/analytics',
        label: 'Analytics & Reports',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
    },
];

export default function AdminDashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        // UPDATED: Navigate to the correct secure login portal route
        navigate('/nud-security-portal');;
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .admin-shell {
                    display: flex;
                    height: 100vh;
                    background: #f5f6fa;
                    font-family: 'DM Sans', sans-serif;
                    color: #1a1d2e;
                    overflow: hidden;
                }

                /* ── SIDEBAR ─────────────────────────────────── */
                .admin-sidebar {
                    width: 240px;
                    flex-shrink: 0;
                    background: #ffffff;
                    border-right: 1px solid #e8eaf0;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    position: relative;
                    z-index: 10;
                    box-shadow: 2px 0 12px rgba(0,0,0,0.04);
                }

                /* subtle gradient accent along top edge */
                .admin-sidebar::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #3b82f6 0%, #6366f1 60%, transparent 100%);
                }

                .sidebar-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 28px 22px 26px;
                    border-bottom: 1px solid #eef0f6;
                }

                .brand-icon {
                    width: 30px;
                    height: 30px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                }

                .brand-label {
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: #1a1d2e;
                }

                .brand-sub {
                    font-size: 10px;
                    font-family: 'DM Mono', monospace;
                    color: #a0a5be;
                    letter-spacing: 0.06em;
                    margin-top: 1px;
                }

                /* ── NAV ─────────────────────────────────── */
                .sidebar-nav {
                    flex: 1;
                    padding: 18px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .nav-section-label {
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #c2c6d8;
                    padding: 0 10px 10px;
                    margin-top: 4px;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border-radius: 8px;
                    font-size: 13.5px;
                    font-weight: 400;
                    color: #6b7194;
                    text-decoration: none;
                    transition: background 0.15s, color 0.15s;
                    position: relative;
                }

                .nav-link:hover {
                    background: #f0f2f9;
                    color: #3b3f5e;
                }

                .nav-link.active {
                    background: rgba(99, 102, 241, 0.08);
                    color: #4f46e5;
                    font-weight: 500;
                }

                .nav-link.active .nav-icon {
                    color: #6366f1;
                }

                .nav-link.active::before {
                    content: '';
                    position: absolute;
                    left: 0; top: 6px; bottom: 6px;
                    width: 3px;
                    background: #6366f1;
                    border-radius: 0 2px 2px 0;
                }

                .nav-icon {
                    color: #c2c6d8;
                    flex-shrink: 0;
                    transition: color 0.15s;
                }

                /* ── BOTTOM SECTION ─────────────────────────────────── */
                .sidebar-footer {
                    padding: 16px 12px;
                    border-top: 1px solid #eef0f6;
                }

                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 12px;
                    background: transparent;
                    border: 1px solid #e8eaf0;
                    border-radius: 8px;
                    color: #9095b0;
                    font-size: 13.5px;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 400;
                    cursor: pointer;
                    transition: background 0.15s, color 0.15s, border-color 0.15s;
                    text-align: left;
                }

                .logout-btn:hover {
                    background: #fff5f5;
                    border-color: #fca5a5;
                    color: #ef4444;
                }

                .logout-btn svg {
                    flex-shrink: 0;
                    opacity: 0.7;
                }

                /* ── MAIN CONTENT ─────────────────────────────────── */
                .admin-main {
                    flex: 1;
                    overflow-y: auto;
                    background: #f5f6fa;
                    padding: 36px 40px;
                    scrollbar-width: thin;
                    scrollbar-color: #dde0ec transparent;
                }

                .admin-main::-webkit-scrollbar { width: 5px; }
                .admin-main::-webkit-scrollbar-track { background: transparent; }
                .admin-main::-webkit-scrollbar-thumb { background: #dde0ec; border-radius: 3px; }
            `}</style>

            <div className="admin-shell">

                {/* SIDEBAR */}
                <aside className="admin-sidebar">

                    <div className="sidebar-brand">
                        <div className="brand-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <div className="brand-label">Admin Panel</div>
                            <div className="brand-sub">v2.0 · secure</div>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-section-label">Navigation</div>

                        {NAV_ITEMS.map(({ to, label, icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `nav-link${isActive ? ' active' : ''}`
                                }
                            >
                                <span className="nav-icon">{icon}</span>
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <button className="logout-btn" onClick={handleLogout}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="admin-main">
                    <Outlet />
                </main>

            </div>
        </>
    );
}