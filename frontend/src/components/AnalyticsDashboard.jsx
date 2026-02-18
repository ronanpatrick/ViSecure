import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today'); // 👈 NEW STATE

    // Use the environment variable so it works on Vercel automatically
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                // Fetch data with the selected PERIOD
                const response = await axios.get(`${API_URL}/api/analytics`, {
                    params: { period: period }
                });
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [period]); // 👈 Re-run when filter changes

    if (loading) return <div className="fade-in" style={{padding: '40px', color: '#6b7280', textAlign: 'center'}}>📊 Calculating Intelligence...</div>;
    if (!data || !data.summary) return <div style={{padding: '40px', textAlign: 'center', color: '#ef4444'}}>⚠️ Database Sync Error</div>;

    // --- CHART MATH ---
    // Calculate max value dynamically to scale bars correctly
    const maxCount = Math.max(
        ...data.peak_hours.map(d => d.count), 
        ...(data.predicted_hours ? Object.values(data.predicted_hours) : [0]), 
        10 // Minimum height to prevent flat charts
    );

    // --- RENDER ---
    return (
        <div className="fade-in" style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            
            {/* 1. HEADER & FILTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ color: '#111827', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>📈 Operational Intelligence</h2>
                    <p style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '13px' }}>
                        {period === 'today' ? "Real-time daily analysis & AI predictions." : "Historical aggregate data analysis."}
                    </p>
                </div>

                {/* 🎛️ STANDARD PERIOD FILTER */}
                <select 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)}
                    style={{
                        padding: '10px 15px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        outline: 'none'
                    }}
                >
                    <option value="today">📅 Today</option>
                    <option value="yesterday">⏪ Yesterday</option>
                    <option value="7_days">🗓️ Last 7 Days</option>
                    <option value="30_days">📆 Last 30 Days</option>
                    <option value="3_months">📊 Last 3 Months</option>
                    <option value="6_months">📈 Last 6 Months</option>
                    <option value="1_year">📅 Last 1 Year</option>
                    <option value="all_time">🗄️ All Time</option>
                </select>
            </div>

            {/* 2. KEY METRICS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <MetricCard 
                    label={period === 'today' ? "VISITS TODAY" : "TOTAL VISITS IN PERIOD"} 
                    value={data.summary.total.toLocaleString()} 
                    color="#3b82f6" 
                />
                <MetricCard 
                    label="CURRENTLY INSIDE" 
                    value={data.summary.active} 
                    color="#10b981" 
                />
                <MetricCard 
                    label={period === 'today' ? "ALERTS TODAY" : "TOTAL SECURITY ALERTS"} 
                    value={data.summary.banned || 0} 
                    color="#ef4444" 
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
                
                {/* 📊 TRAFFIC CHART (With AI Ghost Bars only if 'Today') */}
                <div style={chartBoxStyle}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h3 style={{margin:0, ...chartTitleStyle}}>
                            🕒 {period === 'today' ? "Traffic: Actual vs. Predicted" : "Historical Hourly Traffic"}
                        </h3>
                        {period === 'today' && (
                            <div style={{fontSize:'10px', display:'flex', gap:'10px'}}>
                                <span style={{color:'#3b82f6'}}>● Actual</span>
                                <span style={{color:'#e5e7eb'}}>● AI Predicted</span>
                            </div>
                        )}
                    </div>
                    
                    {/* The Chart Container */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '4px', paddingTop: '20px' }}>
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                            // Find data
                            const log = data.peak_hours.find(d => parseInt(d.hour) === hour);
                            const actualCount = log ? log.count : 0;
                            const predictedCount = data.predicted_hours ? data.predicted_hours[hour] : 0;

                            // Calculate heights
                            const actualHeight = (actualCount / maxCount) * 100;
                            const predictedHeight = (predictedCount / maxCount) * 100;

                            return (
                                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                                        
                                        {/* GHOST BAR (Only show for Today to compare Real vs Expected) */}
                                        {period === 'today' && (
                                            <div style={{ 
                                                width: '60%', height: `${predictedHeight}%`, 
                                                backgroundColor: '#e5e7eb', borderRadius: '2px',
                                                position: 'absolute', bottom: 0, zIndex: 1
                                            }} title={`AI Predicted: ${predictedCount}`}></div>
                                        )}

                                        {/* ACTUAL BAR */}
                                        <div style={{ 
                                            width: period === 'today' ? '40%' : '70%', // Wider bars for historical views
                                            height: `${actualHeight}%`, 
                                            backgroundColor: '#3b82f6', 
                                            borderRadius: '2px', zIndex: 2, opacity: 0.9,
                                            minHeight: '4px' // Always show a baseline
                                        }} title={`${actualCount} visits`}></div>
                                    </div>
                                    <span style={{ fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '5px' }}>
                                        {hour % 3 === 0 ? `${hour}:00` : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 🏢 DEPARTMENT LIST */}
                <div style={chartBoxStyle}>
                    <h3 style={chartTitleStyle}>🏢 Top Departments</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {data.departments.map((dept, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                                    <span style={{ fontWeight: '600', color: '#374151' }}>{dept.DepartmentToVisit}</span>
                                    <span style={{ color: '#6b7280' }}>{dept.count} visits</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${(dept.count / data.summary.total) * 100}%`, 
                                        height: '100%', 
                                        backgroundColor: i === 0 ? '#8b5cf6' : '#c084fc', 
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 📊 DEMOGRAPHICS */}
                <div style={chartBoxStyle}>
                    <h3 style={chartTitleStyle}>👥 Visitor Demographics</h3>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        
                        {/* Sex Distribution */}
                        <div style={{ flex: 1 }}>
                            <h4 style={{fontSize: '12px', color: '#6b7280'}}>BY GENDER</h4>
                            {data.demographics?.sex.map((item, i) => (
                                <div key={i} style={{marginBottom: '8px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                        <span>{item.Sex}</span><span>{item.count}</span>
                                    </div>
                                    <div style={{width:'100%', height:'6px', background:'#f3f4f6', borderRadius:'3px'}}>
                                        <div style={{width: `${(item.count / data.summary.total) * 100}%`, height:'100%', background: '#ec4899', borderRadius:'3px'}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Age Distribution */}
                        <div style={{ flex: 1 }}>
                            <h4 style={{fontSize: '12px', color: '#6b7280'}}>BY AGE</h4>
                            {data.demographics?.age.map((item, i) => (
                                <div key={i} style={{marginBottom: '8px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                        <span>{item.age_range}</span><span>{item.count}</span>
                                    </div>
                                    <div style={{width:'100%', height:'6px', background:'#f3f4f6', borderRadius:'3px'}}>
                                        <div style={{width: `${(item.count / data.summary.total) * 100}%`, height:'100%', background: '#f59e0b', borderRadius:'3px'}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* 🕵️‍♂️ SUSPICIOUS ACTIVITY AUDIT */}
            <div style={{ marginTop: '20px', ...chartBoxStyle }}>
                <h3 style={chartTitleStyle}>
                    🕵️‍♂️ Security Audit: Vague Entries {period !== 'today' && '(Top 10 of Period)'}
                </h3>
                {data.suspicious && data.suspicious.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#9ca3af', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Visitor Name</th>
                                <th style={{ padding: '8px' }}>Logged Purpose</th>
                                <th style={{ padding: '8px' }}>Time</th>
                                <th style={{ padding: '8px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.suspicious.map((log, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.FullName}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ 
                                            backgroundColor: '#fee2e2', color: '#991b1b', 
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' 
                                        }}>
                                            "{log.PurposeOfVisit}"
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', color: '#6b7280' }}>
                                        {new Date(log.EntryTimestamp).toLocaleDateString()} {new Date(log.EntryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <button style={{ border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}>
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#10b981', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
                        ✅ No vague or suspicious entries detected in this period.
                    </div>
                )}
            </div>

        </div>
    );
}

// --- SUB-COMPONENTS & STYLES ---

const MetricCard = ({ label, value, color }) => (
    <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '16px',
        borderLeft: `6px solid ${color}`,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.05em' }}>{label}</span>
        <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '8px 0 0 0', color: '#111827' }}>{value}</h2>
    </div>
);

const chartBoxStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const chartTitleStyle = { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#374151' };
const barValueStyle = { position: 'absolute', top: '-20px', left: '0', width: '100%', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#3b82f6' };