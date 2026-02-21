import { useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
    {
        to: '/admin/monitoring',
        label: 'Live Monitoring',
        badge: 'LIVE',
        icon: (
            // Activity icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
        ),
    },
    {
        to: '/admin/records',
        label: 'Visitor Records',
        icon: (
            // FolderOpen icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
        ),
    },
    {
        to: '/admin/analytics',
        label: 'Analytics & Reports',
        icon: (
            // BarChart2 icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
        ),
    },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/nud-security-portal');
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .ad-shell {
                    display: flex;
                    height: 100vh;
                    font-family: 'DM Sans', sans-serif;
                    color: #0f172a;
                    overflow: hidden;
                }

                /* ══════════════════════════════════════
                   SIDEBAR — Soft Dark Navy
                ══════════════════════════════════════ */
                .ad-sidebar {
                    width: 248px;
                    flex-shrink: 0;
                    /* Approachable deep navy — not pitch black */
                    background: linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 55%, #1e1b4b 100%);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 10;
                    overflow: hidden;
                    box-shadow: 4px 0 24px rgba(17,24,89,0.35);
                }

                /* Subtle top-left radial glow */
                .ad-sidebar::after {
                    content: '';
                    position: absolute;
                    top: -80px;
                    left: -80px;
                    width: 280px;
                    height: 280px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
                    pointer-events: none;
                    z-index: 0;
                }

                /* ── Brand header ── */
                .ad-brand {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 24px 20px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.12);
                }

                .ad-brand-shield {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(145deg, #3b82f6 0%, #6366f1 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.1);
                }

                .ad-brand-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: -0.3px;
                    line-height: 1;
                    margin-bottom: 5px;
                }

                .ad-badge-admin {
                    display: inline-block;
                    font-family: 'DM Mono', monospace;
                    font-size: 8.5px;
                    font-weight: 500;
                    letter-spacing: 0.12em;
                    padding: 2px 7px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.15);
                    color: #e0f2fe;
                    border: 1px solid rgba(255,255,255,0.2);
                }

                /* ── Nav ── */
                .ad-nav {
                    position: relative;
                    z-index: 1;
                    flex: 1;
                    padding: 18px 12px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    overflow-y: auto;
                    scrollbar-width: none;
                }
                .ad-nav::-webkit-scrollbar { display: none; }

                .ad-nav-section {
                    font-size: 9.5px;
                    font-weight: 600;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.35);
                    padding: 0 10px 10px;
                }

                .ad-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 13px;
                    border-radius: 9px;
                    font-size: 13.5px;
                    font-weight: 400;
                    /* text-slate-300 equivalent */
                    color: rgba(203,213,225,0.8);
                    text-decoration: none;
                    transition: background 0.15s, color 0.15s;
                    position: relative;
                    border-left: 3px solid transparent;
                }

                /* hover:bg-white/5 */
                .ad-nav-link:hover {
                    background: rgba(255,255,255,0.1);
                    color: #ffffff;
                }
                .ad-nav-link:hover .ad-nav-icon { color: rgba(255,255,255,0.7); }

                /* Active: bg-indigo-500/20, bright white text, border-l-4 border-indigo-400 */
                .ad-nav-link.active {
                    background: rgba(255,255,255,0.15);
                    color: #ffffff;
                    font-weight: 500;
                    border-left: 3px solid #93c5fd;
                    border-radius: 0 9px 9px 0;
                }
                .ad-nav-link.active .ad-nav-icon { color: #bfdbfe; }

                /* Glowing bar accent on active */
                .ad-nav-link.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 55%;
                    background: #93c5fd;
                    border-radius: 0 2px 2px 0;
                    box-shadow: 0 0 10px 2px rgba(147,197,253,0.6);
                }

                .ad-nav-icon {
                    color: rgba(148,163,184,0.6);
                    flex-shrink: 0;
                    transition: color 0.15s;
                }

                /* LIVE badge */
                .ad-live-badge {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-family: 'DM Mono', monospace;
                    font-size: 8.5px;
                    font-weight: 500;
                    letter-spacing: 0.1em;
                    color: #34d399;
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.25);
                    padding: 2px 7px;
                    border-radius: 20px;
                }
                .ad-live-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 0 0 rgba(16,185,129,0.5);
                    animation: ad-pulse 1.8s ease-in-out infinite;
                }
                @keyframes ad-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
                    50%       { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
                }

                .ad-nav-divider {
                    height: 1px;
                    background: rgba(255,255,255,0.12);
                    margin: 10px 2px;
                }

                /* ── Footer / Profile ── */
                .ad-footer {
                    position: relative;
                    z-index: 1;
                    padding: 14px 12px 18px;
                    border-top: 1px solid rgba(255,255,255,0.15);
                }

                .ad-profile {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 10px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.08);
                    transition: background 0.15s;
                }
                .ad-profile:hover { background: rgba(255,255,255,0.13); }

                .ad-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 9px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 8px rgba(99,102,241,0.35);
                    position: relative;
                }
                /* Online dot */
                .ad-avatar::after {
                    content: '';
                    position: absolute;
                    bottom: -2px; right: -2px;
                    width: 9px; height: 9px;
                    border-radius: 50%;
                    background: #10b981;
                    border: 2px solid #1d4ed8;
                    box-shadow: 0 0 5px rgba(16,185,129,0.5);
                }

                .ad-profile-info { flex: 1; min-width: 0; }
                .ad-profile-name {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #f1f5f9;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1;
                    margin-bottom: 3px;
                }
                .ad-profile-role {
                    font-family: 'DM Mono', monospace;
                    font-size: 10px;
                    color: rgba(191,219,254,0.65);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .ad-logout-icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px; height: 30px;
                    border-radius: 7px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: transparent;
                    color: rgba(148,163,184,0.6);
                    cursor: pointer;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }
                .ad-logout-icon-btn:hover {
                    background: rgba(239,68,68,0.12);
                    border-color: rgba(239,68,68,0.3);
                    color: #fca5a5;
                }

                /* ══════════════════════════════════════
                   LOGOUT MODAL
                ══════════════════════════════════════ */
                .ad-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    /* backdrop-blur-sm */
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    animation: ad-backdrop-in 0.2s ease;
                }
                @keyframes ad-backdrop-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }

                .ad-modal {
                    background: #ffffff;
                    border-radius: 20px;
                    padding: 36px 32px 28px;
                    width: 100%;
                    max-width: 380px;
                    box-shadow:
                        0 24px 60px rgba(0,0,0,0.18),
                        0 0 0 1px rgba(0,0,0,0.04);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    animation: ad-modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
                }
                @keyframes ad-modal-in {
                    from { opacity: 0; transform: scale(0.93) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);  }
                }

                /* Icon in modal */
                .ad-modal-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }

                .ad-modal-title {
                    font-size: 19px;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.3px;
                    margin-bottom: 8px;
                }
                .ad-modal-sub {
                    font-size: 13.5px;
                    color: #64748b;
                    line-height: 1.55;
                    margin-bottom: 28px;
                    max-width: 280px;
                }

                .ad-modal-actions {
                    display: flex;
                    gap: 10px;
                    width: 100%;
                }

                .ad-modal-cancel {
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 10px;
                    border: 1.5px solid #e2e8f0;
                    background: #fff;
                    color: #475569;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'DM Sans', sans-serif;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .ad-modal-cancel:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #334155;
                }

                .ad-modal-confirm {
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 10px;
                    border: none;
                    background: #dc2626;
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'DM Sans', sans-serif;
                    cursor: pointer;
                    transition: all 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    box-shadow: 0 4px 12px rgba(220,38,38,0.3);
                }
                .ad-modal-confirm:hover {
                    background: #b91c1c;
                    box-shadow: 0 6px 16px rgba(220,38,38,0.4);
                    transform: translateY(-1px);
                }
                .ad-modal-confirm:active { transform: translateY(0); }

                /* Session info strip inside modal */
                .ad-modal-session {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    margin-top: 20px;
                    padding: 9px 14px;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                    border-radius: 8px;
                    font-size: 11.5px;
                    color: #94a3b8;
                    font-family: 'DM Mono', monospace;
                    width: 100%;
                    justify-content: center;
                }

                /* ══════════════════════════════════════
                   MAIN CONTENT
                ══════════════════════════════════════ */
                .ad-main {
                    flex: 1;
                    overflow-y: auto;
                    background: #f5f6fa;
                    padding: 36px 40px;
                    scrollbar-width: thin;
                    scrollbar-color: #dde0ec transparent;
                }
                .ad-main::-webkit-scrollbar { width: 5px; }
                .ad-main::-webkit-scrollbar-track { background: transparent; }
                .ad-main::-webkit-scrollbar-thumb { background: #dde0ec; border-radius: 3px; }
            `}</style>

            <div className="ad-shell">

                {/* ══ LOGOUT MODAL ══════════════════════════ */}
                {showLogoutModal && (
                    <div className="ad-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
                        <div className="ad-modal" onClick={e => e.stopPropagation()}>

                            {/* Warning icon */}
                            <div className="ad-modal-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                </svg>
                            </div>

                            <div className="ad-modal-title">End Security Session?</div>
                            <div className="ad-modal-sub">
                                Are you sure you want to securely log out of the admin portal? Any unsaved changes will be lost.
                            </div>

                            <div className="ad-modal-actions">
                                <button className="ad-modal-cancel" onClick={() => setShowLogoutModal(false)}>
                                    Cancel
                                </button>
                                <button className="ad-modal-confirm" onClick={handleLogout}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16 17 21 12 16 7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    Log Out
                                </button>
                            </div>

                            {/* Session detail strip */}
                            <div className="ad-modal-session">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                Session will be securely terminated
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ SIDEBAR ══════════════════════════════════ */}
                <aside className="ad-sidebar">

                    {/* Brand */}
                    <div className="ad-brand">
                        <div className="ad-brand-shield">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <path d="M9 12l2 2 4-4"/>
                            </svg>
                        </div>
                        <div>
                            <div className="ad-brand-name">ViSecure</div>
                            <span className="ad-badge-admin">ADMIN</span>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="ad-nav">
                        <div className="ad-nav-section">Navigation</div>

                        {NAV_ITEMS.map(({ to, label, icon, badge }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `ad-nav-link${isActive ? ' active' : ''}`
                                }
                            >
                                <span className="ad-nav-icon">{icon}</span>
                                {label}
                                {badge && (
                                    <span className="ad-live-badge">
                                        <span className="ad-live-dot"/>
                                        {badge}
                                    </span>
                                )}
                            </NavLink>
                        ))}

                        <div className="ad-nav-divider"/>
                    </nav>

                    {/* Footer */}
                    <div className="ad-footer">
                        <div className="ad-profile">
                            <div className="ad-avatar">SA</div>
                            <div className="ad-profile-info">
                                <div className="ad-profile-name">System Admin</div>
                                <div className="ad-profile-role">Security Office</div>
                            </div>
                            <button
                                className="ad-logout-icon-btn"
                                onClick={() => setShowLogoutModal(true)}
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                </aside>

                {/* ══ MAIN ══════════════════════════════════ */}
                <main className="ad-main">
                    <Outlet />
                </main>

            </div>
        </>
    );
}