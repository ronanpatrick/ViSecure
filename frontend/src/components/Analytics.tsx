import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, AlertCircle, TrendingUp, Clock, Activity, BarChart3 } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [metrics, setMetrics] = useState({
        totalVisitors: 247,
        activeNow: 12,
        riskyVisitors: 3,
        avgDuration: 45,
        peakHour: '02:00 PM'
    });
    
    const [chartData, setChartData] = useState([
        { time: '6 AM', count: 5 },
        { time: '9 AM', count: 18 },
        { time: '12 PM', count: 24 },
        { time: '3 PM', count: 31 },
        { time: '6 PM', count: 28 },
        { time: '9 PM', count: 12 }
    ]);

    const [activityFeed, setActivityFeed] = useState([
        { id: 1, type: 'entry', visitor: 'John Smith', dept: 'Engineering', time: '2 mins ago', status: 'safe' },
        { id: 2, type: 'flag', visitor: 'Sarah Johnson', dept: 'Finance', time: '5 mins ago', status: 'warning' },
        { id: 3, type: 'exit', visitor: 'Mike Davis', dept: 'Sales', time: '8 mins ago', status: 'safe' },
        { id: 4, type: 'alert', visitor: 'Lisa Chen', dept: 'Operations', time: '12 mins ago', status: 'danger' },
        { id: 5, type: 'entry', visitor: 'Robert Wilson', dept: 'HR', time: '15 mins ago', status: 'safe' }
    ]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    // Metric Card Component with Glassmorphism
    const MetricCard = ({ icon: Icon, label, value, trend, color }) => (
        <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(203, 213, 225, 0.5)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            flex: 1,
            minWidth: '200px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
            e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                    background: `linear-gradient(135deg, ${color}1a 0%, ${color}0d 100%)`,
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} color={color} />
                </div>
                {trend && (
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: trend > 0 ? '#059669' : '#dc2626',
                        padding: '4px 8px',
                        background: trend > 0 ? '#ecfdf5' : '#fef2f2',
                        borderRadius: '8px'
                    }}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                {value}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '32px', background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', minHeight: '100vh' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                    Security Dashboard
                </h1>
                <p style={{ margin: '0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                    Real-time facility monitoring & occupancy analytics
                </p>
            </div>

            {/* Metric Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <MetricCard
                    icon={Users}
                    label="Total Visitors"
                    value={metrics.totalVisitors}
                    trend={12}
                    color="#2563eb"
                />
                <MetricCard
                    icon={Activity}
                    label="Active Now"
                    value={metrics.activeNow}
                    trend={-5}
                    color="#059669"
                />
                <MetricCard
                    icon={AlertCircle}
                    label="Risky Visitors"
                    value={metrics.riskyVisitors}
                    trend={0}
                    color="#dc2626"
                />
                <MetricCard
                    icon={Clock}
                    label="Avg Duration"
                    value={`${metrics.avgDuration}m`}
                    trend={8}
                    color="#f97316"
                />
            </div>

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '24px',
                marginBottom: '32px'
            }}>
                {/* Chart Section */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(203, 213, 225, 0.5)',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)'
                }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            Visitor Occupancy Trend
                        </h2>
                        <p style={{ margin: '0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                            Today's hourly distribution
                        </p>
                    </div>

                    {/* Simplified Chart Visualization */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        height: '240px',
                        gap: '12px',
                        paddingBottom: '16px'
                    }}>
                        {chartData.map((data, idx) => {
                            const maxVal = Math.max(...chartData.map(d => d.count));
                            const heightPercent = (data.count / maxVal) * 100;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: `${heightPercent}%`,
                                            background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                                            borderRadius: '8px 8px 0 0',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af, #1e3a8a)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(37, 99, 235, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1e40af)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                                        }}
                                        title={`${data.count} visitors`}
                                    />
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#475569'
                                    }}>
                                        {data.time}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '16px',
                        marginTop: '16px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#64748b'
                        }}>
                            <span>Peak Hour: <strong style={{ color: '#0f172a' }}>2:00 PM</strong></span>
                            <span>Avg: <strong style={{ color: '#0f172a' }}>21 visitors/hr</strong></span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(30, 41, 59, 0.6)',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#e2e8f0' }}>
                            Recent Activity
                        </h2>
                        <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                            LIVE DATA FEED
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        flex: 1,
                        overflowY: 'auto'
                    }}>
                        {activityFeed.map((activity) => {
                            const activityColor = activity.status === 'danger' ? '#dc2626' : activity.status === 'warning' ? '#f97316' : '#059669';
                            const activityBg = activity.status === 'danger' ? 'rgba(220, 38, 38, 0.1)' : activity.status === 'warning' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                            const activityIcon = activity.type === 'entry' ? '→' : activity.type === 'exit' ? '←' : activity.type === 'flag' ? '⚠️' : '🚨';

                            return (
                                <div
                                    key={activity.id}
                                    style={{
                                        padding: '12px 14px',
                                        background: activityBg,
                                        border: `1px solid ${activityColor}40`,
                                        borderLeft: `3px solid ${activityColor}`,
                                        borderRadius: '10px',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = `${activityBg.replace('0.1', '0.15')}`;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = activityBg;
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: '#e2e8f0'
                                        }}>
                                            {activityIcon} {activity.visitor}
                                        </span>
                                        <span style={{
                                            fontSize: '10px',
                                            color: '#94a3b8',
                                            fontWeight: '600'
                                        }}>
                                            {activity.time}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#cbd5e1',
                                        fontWeight: '500'
                                    }}>
                                        {activity.dept}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Stats Section */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)'
            }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Security Alerts & Insights
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                }}>
                    {[
                        { label: 'Flagged Users', value: '3', color: '#dc2626' },
                        { label: 'Watchlist Matches', value: '1', color: '#f97316' },
                        { label: 'Capacity Utilization', value: '24%', color: '#2563eb' },
                        { label: 'Avg Visit Duration', value: '2h 15m', color: '#059669' }
                    ].map((stat, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '16px',
                                background: `${stat.color}08`,
                                border: `1px solid ${stat.color}30`,
                                borderRadius: '12px',
                                borderLeft: `4px solid ${stat.color}`
                            }}
                        >
                            <div style={{
                                fontSize: '12px',
                                color: '#64748b',
                                fontWeight: '600',
                                marginBottom: '4px'
                            }}>
                                {stat.label}
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: '900',
                                color: stat.color
                            }}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
