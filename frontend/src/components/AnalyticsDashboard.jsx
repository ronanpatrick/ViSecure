import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Use the environment variable so it works on Vercel automatically
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch data from your backend
                const response = await axios.get(`${API_URL}/api/analytics`);
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div style={{padding: '40px', color: '#6b7280', textAlign: 'center'}}>Calculating Intelligence...</div>;
    if (!data || !data.summary) return <div style={{padding: '40px', textAlign: 'center', color: '#ef4444'}}>⚠️ Database Sync Error</div>;

    // --- CHART MATH ---
    // Calculate the max value to scale the bars correctly (prevents division by zero)
    const maxCount = Math.max(...data.peak_hours.map(d => d.count), 5); 

    // --- RENDER ---
    return (
        <div className="fade-in" style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ color: '#111827', marginBottom: '25px', fontWeight: '800', letterSpacing: '-0.5px' }}>📈 Operational Intelligence</h2>

            {/* 1. KEY METRICS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <MetricCard 
                    label="TOTAL VISITS TODAY" 
                    value={data.summary.total} 
                    color="#3b82f6" 
                />
                <MetricCard 
                    label="CURRENT OCCUPANCY" 
                    value={data.summary.active} 
                    color="#10b981" 
                />
                <MetricCard 
                    label="SECURITY ALERTS" 
                    value={data.summary.banned || 0} 
                    color="#ef4444" 
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
                
                {/* 📊 NATIVE SVG BAR CHART (Vercel Safe) */}
                <div style={chartBoxStyle}>
                    <h3 style={chartTitleStyle}>🕒 Peak Traffic Distribution</h3>
                    
                    {/* The Chart Container */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '6px', paddingTop: '20px' }}>
                        {data.peak_hours.map((item, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                
                                {/* The Bar */}
                                <div style={{ 
                                    width: '100%', 
                                    height: `${(item.count / maxCount) * 100}%`, 
                                    backgroundColor: '#3b82f6', 
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.5s ease-out',
                                    position: 'relative',
                                    minHeight: '4px' // Ensures empty hours show a tiny line so the chart looks consistent
                                }} title={`${item.count} visitors`}>
                                    {/* Number on top of bar (only if > 0) */}
                                    {item.count > 0 && <span style={barValueStyle}>{item.count}</span>}
                                </div>
                                
                                {/* The Hour Label */}
                                <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{item.hour}:00</span>
                            </div>
                        ))}
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
                                {/* Progress Bar Background */}
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                                    {/* The Fill */}
                                    <div style={{ 
                                        width: `${(dept.count / data.summary.total) * 100}%`, 
                                        height: '100%', 
                                        backgroundColor: i === 0 ? '#8b5cf6' : '#c084fc', // Purple gradient effect
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- SUB-COMPONENTS & STYLES (Clean Code) ---

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