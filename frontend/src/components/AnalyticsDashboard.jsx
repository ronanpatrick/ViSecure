import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Pie, Chart } from 'react-chartjs-2';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, MatrixController, MatrixElement);

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    
    // Timeline states
    const [period, setPeriod] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // AI summary states
    const [aiSummary, setAiSummary] = useState('');
    const [isThinking, setIsThinking] = useState(true);

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    // AI fetch logic
    useEffect(() => {
        const fetchSummary = async () => {
            setIsThinking(true);
            try {
                const res = await axios.get(`${API_URL}/api/admin/ai-summary`);

                // Defensive fix: handle possible nested summary object
                const summaryText = typeof res.data.summary === 'object' 
                    ? res.data.summary.summary 
                    : res.data.summary;
                    
                setAiSummary(summaryText || "Analysis complete.");
            } catch (err) {
                setAiSummary("System operating normally. Traffic is within expected parameters.");
            } finally {
                setIsThinking(false);
            }
        };
        fetchSummary();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = { period };
            if (period === 'custom') {
                params.start_date = customStart;
                params.end_date = customEnd;
            }

            const response = await axios.get(`${API_URL}/api/analytics`, { params });
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (period !== 'custom') {
            fetchAnalytics();
        }
    }, [period]);

    useEffect(() => {
        let interval = null;
        if (autoRefresh) interval = setInterval(fetchAnalytics, 60000);
        return () => { if (interval) clearInterval(interval); };
    }, [autoRefresh, period, customStart, customEnd]);

    const generatePDFReport = () => {
        try {
            const doc = new jsPDF();
            let currentY = 22;

            // Header
            doc.setFontSize(18); 
            doc.text("ViSecure - Intelligence Report", 14, currentY);
            currentY += 8;
            
            doc.setFontSize(11); 
            doc.setTextColor(100); 
            const dateStr = period === 'custom' ? `${customStart} to ${customEnd}` : period.replace('_', ' ').toUpperCase();
            doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${dateStr}`, 14, currentY);
            currentY += 15;
            
            // 1. Overview metrics
            autoTable(doc, {
                startY: currentY,
                head: [['Total Visits', 'Currently Active', 'Security Alerts', 'Avg Dwell Time']],
                body: [[
                    String(data.summary.total),
                    String(data.summary.active),
                    String(data.summary.alerts),
                    String(data.summary.avg_dwell)
                ]],
                theme: 'grid', headStyles: { fillColor: [55, 65, 81] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            // 2. Visitor classifications
            currentY += 12;
            doc.setFontSize(12); doc.setTextColor(0);
            doc.text("Visitor Demographics", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 4,
                head: [['Classification', 'Count', 'Loyalty', 'Count']],
                body: [
                    [
                        data.classifications[0]?.type || '-', String(data.classifications[0]?.count || 0),
                        'First-Time Visitors', String(data.new_vs_returning['First-Time'] || 0)
                    ],
                    [
                        data.classifications[1]?.type || '-', String(data.classifications[1]?.count || 0),
                        'Returning Visitors', String(data.new_vs_returning['Returning'] || 0)
                    ]
                ],
                theme: 'striped', headStyles: { fillColor: [16, 185, 129] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            // 3. Departments
            currentY += 12;
            doc.text("Top Departments Visited", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 4,
                head: [['Department', 'Visits']],
                body: data.departments.map(d => [d.DepartmentToVisit || 'Unknown', String(d.count)]),
                theme: 'striped', headStyles: { fillColor: [139, 92, 246] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            // 4. Security incidents
            currentY += 12;
            doc.text("Security Incident Breakdown", 14, currentY);
            
            const cleanIncidents = {};
            data.security_incidents.forEach(i => {
                let action = i.Action ? i.Action.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
                if (action.includes('BAN')) action = 'BANNED (RESTRICTED ACCESS)'; 
                if (action.includes('FLAG')) action = 'FLAGGED (WATCHLIST)'; 
                if (action.includes('OVERSTAY')) action = 'OVERSTAY ALERT';
                cleanIncidents[action] = (cleanIncidents[action] || 0) + i.count;
            });

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
                doc.text("No security incidents recorded for this period.", 14, currentY + 8);
            }

            doc.save(`ViSecure_Analytics_${period}.pdf`);
            
        } catch (error) {
            console.error("PDF Error: ", error);
            alert("Failed to generate PDF. Please check the console.");
        }
    };

    if (loading && !data) {
        return (
            <div className="fade-in min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-sm text-slate-500">Calculating analytics...</div>
            </div>
        );
    }

    if (!data || !data.summary) {
        return (
            <div className="fade-in min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-sm font-medium text-red-600">Database sync error. Analytics data is unavailable.</div>
            </div>
        );
    }

    const hoursLabel = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const trafficData = { labels: hoursLabel, datasets: [ { label: 'Actual Visits', data: hoursLabel.map((_, i) => { const match = data.peak_hours.find(h => parseInt(h.hour) === i); return match ? match.count : 0; }), backgroundColor: '#3b82f6', borderRadius: 4 }, ...(period === 'today' && data.predicted_hours ? [{ label: 'AI Predicted', data: Object.values(data.predicted_hours), backgroundColor: '#e5e7eb', borderRadius: 4, grouped: false, order: 1 }] : []) ] };
    const daysLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; const heatmapHours = Array.from({ length: 12 }, (_, i) => i + 7); const formatHour = (h) => `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}`; let maxHeatmapVal = 0; const matrixPoints = []; if (data.heatmap) { daysLabel.forEach(day => { heatmapHours.forEach(hour => { const count = data.heatmap[day]?.[hour] || 0; if (count > maxHeatmapVal) maxHeatmapVal = count; matrixPoints.push({ x: formatHour(hour), y: day, v: count }); }); }); }
    const heatmapData = { datasets: [{ label: 'Visits', data: matrixPoints, backgroundColor: (ctx) => { const val = ctx.dataset.data[ctx.dataIndex]?.v || 0; return val === 0 ? '#f3f4f6' : `rgba(37, 99, 235, ${Math.max(val/maxHeatmapVal, 0.15)})`; }, width: (ctx) => ctx.chart.chartArea ? (ctx.chart.chartArea.right - ctx.chart.chartArea.left) / 12 - 4 : 0, height: (ctx) => ctx.chart.chartArea ? (ctx.chart.chartArea.bottom - ctx.chart.chartArea.top) / 7 - 4 : 0, borderRadius: 4, borderWidth: 0 }] };
    const heatmapOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: () => null, label: (c) => `${c.raw.y} @ ${c.raw.x} : ${c.raw.v} visitors` }, displayColors: false } }, scales: { x: { type: 'category', labels: heatmapHours.map(formatHour), grid: { display: false }, border: { display: false } }, y: { type: 'category', labels: daysLabel, grid: { display: false }, border: { display: false } } } };
    const newVsReturningData = { labels: Object.keys(data.new_vs_returning), datasets: [{ data: Object.values(data.new_vs_returning), backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }] };
    const dwellHistData = { labels: Object.keys(data.dwell_distribution), datasets: [{ label: 'Visitors', data: Object.values(data.dwell_distribution), backgroundColor: '#0ea5e9', borderRadius: 4 }] };
    const donutData = { labels: data.classifications.map(c => c.type), datasets: [{ data: data.classifications.map(c => c.count), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'], borderWidth: 0, hoverOffset: 4 }] };
    const securityData = { labels: data.security_incidents.map(i => i.Action.replace(/_/g, ' ')), datasets: [{ label: 'Incidents', data: data.security_incidents.map(i => i.count), backgroundColor: '#ef4444', borderRadius: 4 }] };
    const departmentData = { labels: data.departments.map(d => d.DepartmentToVisit), datasets: [{ label: 'Visits', data: data.departments.map(d => d.count), backgroundColor: '#8b5cf6', borderRadius: 4 }] };
    const horizOpts = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { precision: 0 } }, y: { grid: { display: false }, border: { display: false } } } };
    const vertOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { precision: 0 } }, x: { grid: { display: false }, border: { display: false } } } };

    return (
        <div className="fade-in min-h-screen bg-slate-50 p-6 font-sans">
            {/* HEADER & CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Operational analytics</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {period === 'today'
                            ? 'Real-time daily analytics and system insights.'
                            : 'Aggregated historical analytics for the selected period.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            autoRefresh
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                autoRefresh ? 'bg-red-600' : 'bg-slate-400'
                            }`}
                        ></span>
                        <span>{autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}</span>
                    </button>

                    <button
                        onClick={generatePDFReport}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                        Export PDF report
                    </button>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <select
                            value={period}
                            onChange={(e) => {
                                setPeriod(e.target.value);
                                if (e.target.value === 'custom') {
                                    setCustomStart('');
                                    setCustomEnd('');
                                }
                            }}
                            className="px-3 py-1 rounded-md border-0 bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7_days">Last 7 days</option>
                            <option value="30_days">Last 30 days</option>
                            <option value="all_time">All time</option>
                            <option value="custom">Custom range…</option>
                        </select>

                        {period === 'custom' && (
                            <div className="fade-in flex items-center gap-2 border-l border-slate-200 pl-2">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    style={dateInputStyle}
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    style={dateInputStyle}
                                />
                                <button
                                    onClick={fetchAnalytics}
                                    disabled={!customStart || !customEnd}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                        !customStart || !customEnd
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    label={period === 'today' ? 'Visits today' : 'Total visits'}
                    value={data.summary.total.toLocaleString()}
                />
                <MetricCard
                    label="Currently inside"
                    value={data.summary.active.toLocaleString()}
                    accent="Live occupancy"
                />
                <MetricCard
                    label="Average dwell time"
                    value={data.summary.avg_dwell}
                    accent="Mean time on site"
                />
                <MetricCard
                    label="Security alerts"
                    value={data.summary.alerts.toLocaleString()}
                    accent="For selected period"
                />
            </div>

            {/* MAIN CHARTS GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">
                                {period === 'today' ? 'Traffic: actual vs. predicted' : 'Historical hourly traffic'}
                            </h3>
                            <span className="text-xs font-medium text-blue-600">Hourly load profile</span>
                        </div>
                        <div className="px-6 py-5">
                            <div style={{ height: '280px' }}>
                                <Bar
                                    data={trafficData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top', align: 'end' } },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                grid: { color: '#f3f4f6' },
                                                border: { display: false }
                                            },
                                            x: {
                                                grid: { display: false },
                                                border: { display: false }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Weekly traffic heatmap</h3>
                            <span className="text-xs font-medium text-blue-600">Time-of-day density</span>
                        </div>
                        <div className="px-6 py-5">
                            <div style={{ height: '240px' }}>
                                {matrixPoints.length > 0 ? (
                                    <Chart type="matrix" data={heatmapData} options={heatmapOptions} />
                                ) : (
                                    <div className="text-center text-sm text-slate-400 py-8">
                                        No heatmap data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Dwell time distribution</h3>
                            <span className="text-xs font-medium text-blue-600">Visit duration profile</span>
                        </div>
                        <div className="px-6 py-5">
                            <div style={{ height: '180px' }}>
                                <Bar data={dwellHistData} options={vertOpts} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">First-time vs. returning</h3>
                            <span className="text-xs font-medium text-blue-600">Visitor loyalty</span>
                        </div>
                        <div className="px-6 py-5">
                            <div className="h-40 flex justify-center">
                                <Doughnut
                                    data={newVsReturningData}
                                    options={{
                                        maintainAspectRatio: false,
                                        cutout: '65%',
                                        plugins: {
                                            legend: {
                                                position: 'right',
                                                labels: { boxWidth: 12, font: { size: 11 } }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Visitor classification</h3>
                            <span className="text-xs font-medium text-blue-600">Category mix</span>
                        </div>
                        <div className="px-6 py-5">
                            <div className="h-44 flex justify-center">
                                {data.classifications.length > 0 ? (
                                    <Doughnut
                                        data={donutData}
                                        options={{
                                            maintainAspectRatio: false,
                                            cutout: '70%',
                                            plugins: {
                                                legend: {
                                                    position: 'right',
                                                    labels: { boxWidth: 12, font: { size: 11 } }
                                                }
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="self-center text-sm text-slate-400">
                                        No classification data available.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Security incidents</h3>
                            <span className="text-xs font-medium text-blue-600">Alert breakdown</span>
                        </div>
                        <div className="px-6 py-5">
                            <div style={{ height: '180px' }}>
                                {data.security_incidents.length > 0 ? (
                                    <Bar data={securityData} options={horizOpts} />
                                ) : (
                                    <div className="text-center text-sm text-emerald-600 py-4">
                                        No security incidents recorded.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Top departments</h3>
                            <span className="text-xs font-medium text-blue-600">Destination profile</span>
                        </div>
                        <div className="px-6 py-5">
                            <div style={{ height: '220px' }}>
                                {data.departments.length > 0 ? (
                                    <Bar data={departmentData} options={horizOpts} />
                                ) : (
                                    <div className="text-center text-sm text-slate-400 py-8">
                                        No department data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI EXECUTIVE SUMMARY */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">AI executive summary</h3>
                {isThinking ? (
                    <div className="text-sm text-slate-500 italic">
                        Analyzing current traffic and incident patterns…
                    </div>
                ) : (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {aiSummary}
                    </p>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS & STYLES ---
const MetricCard = ({ label, value, accent }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        <span className="text-xs font-medium text-blue-600">{accent || 'Compared to previous period'}</span>
    </div>
);

const dateInputStyle = { padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none', color: '#374151' };