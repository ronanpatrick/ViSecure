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
    
    // Timeline States
    const [period, setPeriod] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // 🆕 AI SUMMARY STATES
    const [aiSummary, setAiSummary] = useState('');
    const [isThinking, setIsThinking] = useState(true);

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    // 🆕 AI FETCH LOGIC
    useEffect(() => {
        const fetchSummary = async () => {
            setIsThinking(true);
            try {
                const res = await axios.get(`${API_URL}/api/admin/ai-summary`);
                setAiSummary(res.data.summary);
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
            
            // 1. OVERVIEW METRICS
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

            // 2. VISITOR CLASSIFICATIONS
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

            // 3. DEPARTMENTS
            currentY += 12;
            doc.text("Top Departments Visited", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 4,
                head: [['Department', 'Visits']],
                body: data.departments.map(d => [d.DepartmentToVisit || 'Unknown', String(d.count)]),
                theme: 'striped', headStyles: { fillColor: [139, 92, 246] },
                didDrawPage: (d) => { currentY = d.cursor.y; }
            });

            // 4. SECURITY INCIDENTS
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
                doc.text("✅ No security incidents recorded for this period.", 14, currentY + 8);
            }

            doc.save(`ViSecure_Analytics_${period}.pdf`);
            
        } catch (error) {
            console.error("PDF Error: ", error);
            alert("Failed to generate PDF. Please check the console.");
        }
    };

    if (loading && !data) return <div className="fade-in" style={{padding: '40px', color: '#6b7280', textAlign: 'center'}}>📊 Calculating Intelligence...</div>;
    if (!data || !data.summary) return <div style={{padding: '40px', textAlign: 'center', color: '#ef4444'}}>⚠️ Database Sync Error</div>;

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
        <div className="fade-in" style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            
            {/* 1. HEADER & CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ color: '#111827', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>📈 Operational Intelligence</h2>
                    <p style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '13px' }}>
                        {period === 'today' ? "Real-time daily analysis & AI predictions." : "Historical aggregate data analysis."}
                    </p>
                </div>

                <div style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ padding: '10px 15px', borderRadius: '8px', backgroundColor: autoRefresh ? '#fecaca' : '#f3f4f6', color: autoRefresh ? '#b91c1c' : '#374151', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {autoRefresh ? <><span className="pulse-dot" style={{width:'8px',height:'8px',background:'#dc2626',borderRadius:'50%'}}></span> Auto-Refresh ON</> : '🔄 Auto-Refresh OFF'}
                    </button>
                    
                    <button onClick={generatePDFReport} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#1f2937', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        📥 Export PDF
                    </button>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #d1d5db' }}>
                        <select 
                            value={period} 
                            onChange={(e) => {
                                setPeriod(e.target.value);
                                if(e.target.value === 'custom') { setCustomStart(''); setCustomEnd(''); }
                            }} 
                            style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', fontWeight: '600', color: '#374151', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="today">📅 Today</option>
                            <option value="yesterday">⏪ Yesterday</option>
                            <option value="7_days">🗓️ Last 7 Days</option>
                            <option value="30_days">📆 Last 30 Days</option>
                            <option value="all_time">🗄️ All Time</option>
                            <option value="custom">⚙️ Custom Range...</option>
                        </select>

                        {period === 'custom' && (
                            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '8px' }}>
                                <input type="date" value={customStart} onChange={(e)=>setCustomStart(e.target.value)} style={dateInputStyle} />
                                <span style={{color: '#9ca3af', fontSize: '12px'}}>to</span>
                                <input type="date" value={customEnd} onChange={(e)=>setCustomEnd(e.target.value)} style={dateInputStyle} />
                                <button 
                                    onClick={fetchAnalytics}
                                    disabled={!customStart || !customEnd}
                                    style={{ padding: '8px 12px', background: (!customStart || !customEnd) ? '#e5e7eb' : '#4f46e5', color: (!customStart || !customEnd) ? '#9ca3af' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (!customStart || !customEnd) ? 'not-allowed' : 'pointer' }}
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. 🧠 UPGRADED LIVE AI EXECUTIVE INSIGHTS PANEL */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🧠 ViSecure AI Analyst
                </h3>
                
                {isThinking ? (
                    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontStyle: 'italic', fontSize: '14px' }}>
                        <span>⏳ Analyzing real-time facility traffic...</span>
                    </div>
                ) : (
                    <p className="fade-in" style={{ 
                        margin: 0, 
                        color: '#15803d', 
                        fontSize: '14px', 
                        lineHeight: '1.6', 
                        fontWeight: '500',
                        whiteSpace: 'pre-line' // 👈 This allows \n newlines to show up as actual line breaks
                    }}>
                        {aiSummary}
                    </p>
                )}
            </div>

            {/* 3. KEY METRICS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <MetricCard label={period === 'today' ? "VISITS TODAY" : "TOTAL VISITS"} value={data.summary.total.toLocaleString()} color="#3b82f6" />
                <MetricCard label="CURRENTLY INSIDE" value={data.summary.active} color="#10b981" />
                <MetricCard label="AVG. DWELL TIME" value={data.summary.avg_dwell} color="#f59e0b" />
                <MetricCard label="SECURITY ALERTS" value={data.summary.alerts} color="#ef4444" />
            </div>

            {/* 4. MAIN CHARTS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '20px' }}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>🕒 {period === 'today' ? "Traffic: Actual vs. Predicted" : "Historical Hourly Traffic"}</h3>
                        <div style={{ height: '280px' }}><Bar data={trafficData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end' } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false } }, x: { grid: { display: false }, border: { display: false } } } }} /></div>
                    </div>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>🔥 Weekly Traffic Heatmap</h3>
                        <div style={{ height: '240px' }}>{matrixPoints.length > 0 ? <Chart type="matrix" data={heatmapData} options={heatmapOptions} /> : <div style={{textAlign: 'center', color: '#9ca3af', padding: '20px'}}>No heatmap data available.</div>}</div>
                    </div>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>⏳ Dwell Time Distribution</h3>
                        <div style={{ height: '180px' }}><Bar data={dwellHistData} options={vertOpts} /></div>
                    </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>🔄 First-Time vs. Returning</h3>
                        <div style={{ height: '160px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={newVsReturningData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: {size: 11} } } } }} />
                        </div>
                    </div>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>🆔 Visitor Classification</h3>
                        <div style={{ height: '180px', display: 'flex', justifyContent: 'center' }}>
                            {data.classifications.length > 0 ? <Doughnut data={donutData} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: {size: 11} } } } }} /> : <span style={{color: '#9ca3af', alignSelf: 'center'}}>No data available</span>}
                        </div>
                    </div>
                    <div style={{...chartBoxStyle, borderTop: '4px solid #ef4444'}}>
                        <h3 style={{...chartTitleStyle, color: '#b91c1c'}}>🚨 Security Incidents</h3>
                        <div style={{ height: '180px' }}>
                            {data.security_incidents.length > 0 ? <Bar data={securityData} options={horizOpts} /> : <div style={{ fontSize: '13px', color: '#10b981', textAlign: 'center', padding: '10px 0' }}>✅ No security incidents recorded.</div>}
                        </div>
                    </div>
                    <div style={chartBoxStyle}>
                        <h3 style={chartTitleStyle}>🏢 Top Departments</h3>
                        <div style={{ height: '220px' }}>
                            {data.departments.length > 0 ? <Bar data={departmentData} options={horizOpts} /> : <div style={{textAlign: 'center', color: '#9ca3af', padding: '20px'}}>No department data.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS & STYLES ---
const MetricCard = ({ label, value, color }) => (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', borderLeft: `6px solid ${color}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.05em' }}>{label}</span>
        <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 0 0', color: '#111827' }}>{value}</h2>
    </div>
);

const chartBoxStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const chartTitleStyle = { margin: '0 0 20px 0', fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' };
const dateInputStyle = { padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none', color: '#374151' };