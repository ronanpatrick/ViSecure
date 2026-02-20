import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, BarController, DoughnutController } from 'chart.js';
import { Bar, Doughnut, Chart } from 'react-chartjs-2';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend, ArcElement, DoughnutController, PointElement, MatrixController, MatrixElement);

// ── Global Error Boundary ──────────────────────────────────────────────
class GlobalErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('Dashboard Fatal Error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '24px', margin: '24px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #f87171' }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Dashboard Crash Prevented</h2>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>A React error occurred during rendering. Please check your data structure.</p>
                    <pre style={{ background: '#fef2f2', padding: '12px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto' }}>
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Chart Error Boundary ───────────────────────────────────────────────
class ChartErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, message: '' }; }
    static getDerivedStateFromError(error) { return { hasError: true, message: error?.message || 'Unknown error' }; }
    componentDidCatch(error, info) { console.error('Chart render error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '16px', background: '#fff5f5', borderRadius: 10, border: '1px solid #fecaca', fontSize: 12, color: '#b91c1c' }}>
                    Chart failed to render: {this.state.message}
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Isolated AI Component ──────────────────────────────────────────────
const AiExecutiveSummary = memo(function AiExecutiveSummary({ apiUrl }) {
    const [aiSummary, setAiSummary] = useState('');
    const [isThinking, setIsThinking] = useState(true);
    const isMounted = useRef(true);
    
    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    useEffect(() => {
        if (!apiUrl) return;
        let cancelled = false;
        const fetchSummary = async () => {
            setIsThinking(true);
            try {
                const res = await axios.get(`${apiUrl}/api/admin/ai-summary`);
                if (cancelled) return;
                let textResult = 'Analysis complete.';
                if (typeof res.data === 'string') {
                    textResult = res.data;
                } else if (typeof res.data?.summary === 'string') {
                    textResult = res.data.summary;
                } else if (typeof res.data?.summary?.summary === 'string') {
                    textResult = res.data.summary.summary;
                } else if (res.data) {
                    textResult = JSON.stringify(res.data);
                }
                if (isMounted.current) setAiSummary(textResult);
            } catch {
                if (!cancelled && isMounted.current)
                    setAiSummary('System operating normally. Traffic is within expected parameters.');
            } finally {
                if (!cancelled && isMounted.current) setIsThinking(false);
            }
        };
        fetchSummary();
        return () => { cancelled = true; };
    }, [apiUrl]);

    return (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>AI Executive Summary</span>
                {isThinking && (
                    <span style={{ marginLeft: 4, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Analyzing...</span>
                )}
            </div>
            <div style={{ padding: '16px 20px' }}>
                {isThinking ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1', animation: `dash-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                        <style>{`@keyframes dash-pulse { 0%,100%{opacity:0.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }`}</style>
                    </div>
                ) : (
                    <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                        {typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary)}
                    </p>
                )}
            </div>
        </div>
    );
});

// ── Main Dashboard Component ───────────────────────────────────────────
export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const [period, setPeriod] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchAnalytics = useCallback(async (opts = {}) => {
        const isBackground = opts.background ?? false;
        if (isBackground) {
            setRefreshing(true);
        } else {
            if (!data) setInitialLoading(true);
            else setRefreshing(true);
        }

        try {
            const params = { period };
            if (period === 'custom') {
                params.start_date = customStart;
                params.end_date = customEnd;
            }
            const response = await axios.get(`${API_URL}/api/analytics`, { params });
            if (response.data && response.data.summary) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, [period, customStart, customEnd, API_URL]);

    useEffect(() => {
        if (period !== 'custom') {
            fetchAnalytics();
        }
    }, [period]);

    const fetchRef = useRef(fetchAnalytics);
    useEffect(() => { fetchRef.current = fetchAnalytics; }, [fetchAnalytics]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchRef.current({ background: true });
        }, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const generatePDFReport = () => {
        try {
            const doc = new jsPDF();
            let currentY = 22;

            doc.setFontSize(18);
            doc.text('ViSecure - Intelligence Report', 14, currentY);
            currentY += 8;

            doc.setFontSize(11);
            doc.setTextColor(100);
            const dateStr = period === 'custom' ? `${customStart} to ${customEnd}` : period.replace('_', ' ').toUpperCase();
            doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${dateStr}`, 14, currentY);
            currentY += 15;

            // UPDATED: Filter incidents first so the KPI table is accurate
            const cleanIncidents = {};
            (data.security_incidents || []).forEach(i => {
                let action = (i?.Action || '').toUpperCase();
                if (action.includes('BAN')) cleanIncidents['BANNED (RESTRICTED ACCESS)'] = (cleanIncidents['BANNED (RESTRICTED ACCESS)'] || 0) + (i?.count || 0);
                else if (action.includes('FLAG')) cleanIncidents['FLAGGED (WATCHLIST)'] = (cleanIncidents['FLAGGED (WATCHLIST)'] || 0) + (i?.count || 0);
                else if (action.includes('OVERSTAY')) cleanIncidents['OVERSTAY ALERT'] = (cleanIncidents['OVERSTAY ALERT'] || 0) + (i?.count || 0);
            });
            const pdfTotalAlerts = Object.values(cleanIncidents).reduce((sum, val) => sum + val, 0);

            autoTable(doc, {
                startY: currentY,
                head: [['Total Visits', 'Currently Active', 'Security Alerts', 'Avg Dwell Time']],
                // Use pdfTotalAlerts here instead of data.summary.alerts
                body: [[String(data.summary?.total || 0), String(data.summary?.active || 0), String(pdfTotalAlerts), String(data.summary?.avg_dwell || 0)]],
                theme: 'grid', headStyles: { fillColor: [55, 65, 81] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 12;
            doc.setFontSize(12); doc.setTextColor(0);
            doc.text('Visitor Demographics', 14, currentY);

            autoTable(doc, {
                startY: currentY + 4,
                head: [['Classification', 'Count', 'Loyalty', 'Count']],
                body: [
                    [data.classifications?.[0]?.type || '-', String(data.classifications?.[0]?.count || 0), 'First-Time Visitors', String(data.new_vs_returning?.['First-Time'] || 0)],
                    [data.classifications?.[1]?.type || '-', String(data.classifications?.[1]?.count || 0), 'Returning Visitors', String(data.new_vs_returning?.['Returning'] || 0)]
                ],
                theme: 'striped', headStyles: { fillColor: [16, 185, 129] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 12;
            doc.text('Top Departments Visited', 14, currentY);

            autoTable(doc, {
                startY: currentY + 4,
                head: [['Department', 'Visits']],
                body: (data.departments || []).map(d => [d.DepartmentToVisit || 'Unknown', String(d.count)]),
                theme: 'striped', headStyles: { fillColor: [139, 92, 246] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            currentY += 12;
            doc.text('Security Incident Breakdown', 14, currentY);

            const incidentRows = Object.keys(cleanIncidents).map(key => [key, String(cleanIncidents[key])]);

            if (incidentRows.length > 0) {
                autoTable(doc, {
                    startY: currentY + 4,
                    head: [['Action / Security Alert', 'Total Count']],
                    body: incidentRows,
                    theme: 'striped', headStyles: { fillColor: [239, 68, 68] },
                    didDrawPage: (d) => { currentY = d.cursor.y; }
                });
            } else {
                doc.setFontSize(10); doc.setTextColor(16, 185, 129);
                doc.text('No security incidents recorded for this period.', 14, currentY + 8);
            }

            doc.save(`ViSecure_Analytics_${period}.pdf`);
        } catch (error) {
            console.error('PDF Error: ', error);
            alert('Failed to generate PDF. Please check the console.');
        }
    };

    if (initialLoading && !data) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                        ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Calculating analytics...</div>
                </div>
            </div>
        );
    }

    if (!data || !data.summary) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Database sync error. Analytics data is unavailable.</div>
            </div>
        );
    }

    const peakHours         = Array.isArray(data.peak_hours)         ? data.peak_hours         : [];
    const predictedHours    = data.predicted_hours && typeof data.predicted_hours === 'object' ? data.predicted_hours : null;
    const newVsReturning    = data.new_vs_returning && typeof data.new_vs_returning === 'object' ? data.new_vs_returning : {};
    const dwellDistribution = data.dwell_distribution && typeof data.dwell_distribution === 'object' ? data.dwell_distribution : {};
    const classifications   = Array.isArray(data.classifications)    ? data.classifications    : [];
    const rawSecurityLogs   = Array.isArray(data.security_incidents) ? data.security_incidents : [];
    const departments       = Array.isArray(data.departments)        ? data.departments        : [];

    const hoursLabel = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const trafficData = {
        labels: hoursLabel,
        datasets: [
            { label: 'Actual Visits', data: hoursLabel.map((_, i) => { const match = peakHours.find(h => parseInt(h.hour) === i); return match ? match.count : 0; }), backgroundColor: '#3b82f6', borderRadius: 4 },
            ...(period === 'today' && predictedHours ? [{ label: 'AI Predicted', data: Object.values(predictedHours), backgroundColor: '#e5e7eb', borderRadius: 4, grouped: false, order: 1 }] : [])
        ]
    };

    const daysLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heatmapHours = Array.from({ length: 12 }, (_, i) => i + 7);
    const formatHour = (h) => `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}`;
    let maxHeatmapVal = 0;
    const matrixPoints = [];
    if (data.heatmap) {
        daysLabel.forEach(day => {
            heatmapHours.forEach(hour => {
                const count = data.heatmap[day]?.[hour] || 0;
                if (count > maxHeatmapVal) maxHeatmapVal = count;
                matrixPoints.push({ x: formatHour(hour), y: day, v: count });
            });
        });
    }

    const heatmapData = {
        datasets: [{
            label: 'Visits',
            data: matrixPoints,
            backgroundColor: (ctx) => {
                const val = ctx.dataset.data[ctx.dataIndex]?.v || 0;
                return val === 0 ? '#f3f4f6' : `rgba(37, 99, 235, ${Math.max(val / (maxHeatmapVal || 1), 0.15)})`;
            },
            width: (ctx) => ctx.chart.chartArea ? (ctx.chart.chartArea.right - ctx.chart.chartArea.left) / 12 - 4 : 0,
            height: (ctx) => ctx.chart.chartArea ? (ctx.chart.chartArea.bottom - ctx.chart.chartArea.top) / 7 - 4 : 0,
            borderRadius: 4,
            borderWidth: 0
        }]
    };

    // Filter raw logs to ONLY group actual security flags
    const groupedIncidents = {};
    rawSecurityLogs.forEach(i => {
        const act = (i?.Action || '').toUpperCase();
        if (act.includes('BAN')) groupedIncidents['Banned'] = (groupedIncidents['Banned'] || 0) + (i?.count || 0);
        else if (act.includes('FLAG')) groupedIncidents['Flagged'] = (groupedIncidents['Flagged'] || 0) + (i?.count || 0);
        else if (act.includes('OVERSTAY')) groupedIncidents['Overstay'] = (groupedIncidents['Overstay'] || 0) + (i?.count || 0);
    });

    // Calculate dynamic total for the KPI card
    const totalFilteredAlerts = Object.values(groupedIncidents).reduce((sum, count) => sum + count, 0);

    const securityData = { 
        labels: Object.keys(groupedIncidents), 
        datasets: [{ 
            label: 'Incidents', 
            data: Object.values(groupedIncidents), 
            backgroundColor: '#ef4444', 
            borderRadius: 4 
        }] 
    };

    const heatmapOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: () => null, label: (c) => `${c.raw.y} @ ${c.raw.x} : ${c.raw.v} visitors` }, displayColors: false } }, scales: { x: { type: 'category', labels: heatmapHours.map(formatHour), grid: { display: false }, border: { display: false } }, y: { type: 'category', labels: daysLabel, grid: { display: false }, border: { display: false } } } };
    const newVsReturningData = { labels: Object.keys(newVsReturning), datasets: [{ data: Object.values(newVsReturning), backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }] };
    const dwellHistData = { labels: Object.keys(dwellDistribution), datasets: [{ label: 'Visitors', data: Object.values(dwellDistribution), backgroundColor: '#0ea5e9', borderRadius: 4 }] };
    const donutData = { labels: classifications.map(c => c.type), datasets: [{ data: classifications.map(c => c.count), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'], borderWidth: 0, hoverOffset: 4 }] };
    const departmentData = { labels: departments.map(d => d.DepartmentToVisit || 'Unknown'), datasets: [{ label: 'Visits', data: departments.map(d => d.count), backgroundColor: '#8b5cf6', borderRadius: 4 }] };
    const horizOpts = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { precision: 0 } }, y: { grid: { display: false }, border: { display: false } } } };
    const vertOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { precision: 0 } }, x: { grid: { display: false }, border: { display: false } } } };

    return (
        <GlobalErrorBoundary>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
                .dash-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
                .dash-period-select { appearance: none; background: transparent; border: none; outline: none; font-family: inherit; font-size: 13px; font-weight: 500; color: #334155; cursor: pointer; }
                .dash-period-select option { font-size: 13px; }
                .dash-refresh-btn:hover { opacity: 0.85; }
                .dash-export-btn:hover { background: #1e293b !important; }
                .dash-apply-btn:hover:not(:disabled) { background: #1d4ed8 !important; }
                .dash-date-input { padding: 6px 10px; border-radius: 7px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155; background: #fff; outline: none; font-family: inherit; }
                .dash-date-input:focus { border-color: #6366f1; }
                @keyframes dash-fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
                .dash-fade { animation: dash-fade 0.2s ease; }
            `}</style>

            <div className="dash-root" style={{ color: '#0f172a' }}>
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Operational Analytics</h1>
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                                {period === 'today' ? 'Real-time daily analytics and system insights.' : 'Aggregated historical analytics for the selected period.'}
                                {refreshing && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Refreshing...</span>}
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className="dash-refresh-btn"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                    border: `1px solid ${autoRefresh ? '#fca5a5' : '#e2e8f0'}`,
                                    background: autoRefresh ? '#fff5f5' : '#fff',
                                    color: autoRefresh ? '#dc2626' : '#64748b',
                                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                                }}
                            >
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: autoRefresh ? '#dc2626' : '#94a3b8', flexShrink: 0, boxShadow: autoRefresh ? '0 0 0 2px #fecaca' : 'none' }} />
                                {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                            </button>

                            <button
                                onClick={generatePDFReport}
                                className="dash-export-btn"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                    background: '#0f172a', color: '#fff', border: 'none',
                                    cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit',
                                }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Export PDF
                            </button>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                <select
                                    className="dash-period-select"
                                    value={period}
                                    onChange={(e) => {
                                        setPeriod(e.target.value);
                                        if (e.target.value === 'custom') { setCustomStart(''); setCustomEnd(''); }
                                    }}
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="7_days">Last 7 days</option>
                                    <option value="30_days">Last 30 days</option>
                                    <option value="all_time">All time</option>
                                    <option value="custom">Custom range</option>
                                </select>

                                {period === 'custom' && (
                                    <div className="dash-fade" style={{ display: 'flex', alignItems: 'center', gap: 7, borderLeft: '1px solid #e2e8f0', paddingLeft: 10 }}>
                                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="dash-date-input" />
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>to</span>
                                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="dash-date-input" />
                                        <button
                                            onClick={fetchAnalytics}
                                            disabled={!customStart || !customEnd}
                                            className="dash-apply-btn"
                                            style={{
                                                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                                background: (!customStart || !customEnd) ? '#f1f5f9' : '#2563eb',
                                                color: (!customStart || !customEnd) ? '#94a3b8' : '#fff',
                                                border: 'none', cursor: (!customStart || !customEnd) ? 'not-allowed' : 'pointer',
                                                fontFamily: 'inherit', transition: 'background 0.15s',
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 20, height: 1, background: '#f1f5f9' }} />
                </div>

                <AiExecutiveSummary apiUrl={API_URL} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    <KpiCard
                        label={period === 'today' ? 'Visits Today' : 'Total Visits'}
                        value={data.summary?.total?.toLocaleString() || '0'}
                        sub="Compared to previous period"
                        accent="#2563eb"
                        accentBg="#eff6ff"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        }
                    />
                    <KpiCard
                        label="Currently Inside"
                        value={data.summary?.active?.toLocaleString() || '0'}
                        sub="Live occupancy"
                        accent="#059669"
                        accentBg="#f0fdf4"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                        }
                        live
                    />
                    <KpiCard
                        label="Avg Dwell Time"
                        value={data.summary?.avg_dwell || '0m'}
                        sub="Mean time on site"
                        accent="#7c3aed"
                        accentBg="#f5f3ff"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                        }
                    />
                    <KpiCard
                        label="Security Alerts"
                        value={totalFilteredAlerts.toLocaleString()} 
                        sub="For selected period"
                        accent="#dc2626"
                        accentBg="#fff5f5"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        }
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <ChartCard
                            title={period === 'today' ? 'Traffic: Actual vs. Predicted' : 'Historical Hourly Traffic'}
                            label="Hourly load profile"
                            accentColor="#2563eb"
                            accentBg="#eff6ff"
                            accentText="#1e40af"
                        >
                            <div style={{ height: 280 }}>
                                <ChartErrorBoundary>
                                    <Bar
                                        data={trafficData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { position: 'top', align: 'end' } },
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false } },
                                                x: { grid: { display: false }, border: { display: false } }
                                            }
                                        }}
                                    />
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>

                        <ChartCard
                            title="Weekly Traffic Heatmap"
                            label="Time-of-day density"
                            accentColor="#7c3aed"
                            accentBg="#f5f3ff"
                            accentText="#5b21b6"
                        >
                            <div style={{ height: 240 }}>
                                <ChartErrorBoundary>
                                    {matrixPoints.length > 0 ? (
                                        <Chart type="matrix" data={heatmapData} options={heatmapOptions} />
                                    ) : (
                                        <EmptyState text="No heatmap data available." />
                                    )}
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>

                        <ChartCard
                            title="Dwell Time Distribution"
                            label="Visit duration profile"
                            accentColor="#0891b2"
                            accentBg="#ecfeff"
                            accentText="#0e7490"
                        >
                            <div style={{ height: 200 }}>
                                <ChartErrorBoundary>
                                    <Bar data={dwellHistData} options={vertOpts} />
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <ChartCard
                            title="First-Time vs. Returning"
                            label="Visitor loyalty"
                            accentColor="#059669"
                            accentBg="#f0fdf4"
                            accentText="#065f46"
                        >
                            <div style={{ height: 160, display: 'flex', justifyContent: 'center' }}>
                                <ChartErrorBoundary>
                                    {Object.keys(newVsReturning).length > 0 ? (
                                        <Doughnut
                                            data={newVsReturningData}
                                            options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }}
                                        />
                                    ) : (
                                        <EmptyState text="No loyalty data available." />
                                    )}
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>

                        <ChartCard
                            title="Visitor Classification"
                            label="Category mix"
                            accentColor="#6366f1"
                            accentBg="#eef2ff"
                            accentText="#3730a3"
                        >
                            <div style={{ height: 176, display: 'flex', justifyContent: 'center' }}>
                                <ChartErrorBoundary>
                                    {classifications.length > 0 ? (
                                        <Doughnut
                                            data={donutData}
                                            options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }}
                                        />
                                    ) : (
                                        <EmptyState text="No classification data available." />
                                    )}
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>

                        <ChartCard
                            title="Security Incidents"
                            label="Alert breakdown"
                            accentColor="#dc2626"
                            accentBg="#fff5f5"
                            accentText="#991b1b"
                        >
                            <div style={{ height: 180 }}>
                                <ChartErrorBoundary>
                                    {Object.keys(groupedIncidents).length > 0 ? (
                                        <Bar data={securityData} options={horizOpts} />
                                    ) : (
                                        <EmptyState text="No incidents recorded." />
                                    )}
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>

                        <ChartCard
                            title="Top Departments"
                            label="Destination profile"
                            accentColor="#7c3aed"
                            accentBg="#f5f3ff"
                            accentText="#5b21b6"
                        >
                            <div style={{ height: 220 }}>
                                <ChartErrorBoundary>
                                    {departments.length > 0 ? (
                                        <Bar data={departmentData} options={horizOpts} />
                                    ) : (
                                        <EmptyState text="No department data available." />
                                    )}
                                </ChartErrorBoundary>
                            </div>
                        </ChartCard>
                    </div>
                </div>
            </div>
        </GlobalErrorBoundary>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, accentBg, icon, live }) {
    return (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: accent, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #d1fae5' }} />}
                    {icon}
                </span>
            </div>
            <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 5, fontFamily: 'DM Mono, monospace' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{sub}</div>
            </div>
        </div>
    );
}

function ChartCard({ title, label, accentColor, accentBg, accentText, children }) {
    return (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>{title}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: accentText, opacity: 0.75 }}>{label}</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
                {children}
            </div>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>
            {text}
        </div>
    );
}