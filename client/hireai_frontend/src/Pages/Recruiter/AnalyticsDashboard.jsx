import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { getRecruiterSummary, getRecruiterJobApplications } from '../../services/analyticsService';
import NotificationBell from '../../Components/NotificationBell';
import useSSE from '../../hooks/useSSE';
import { logoutUser } from '../../store/slices/authSlice';
import './AnalyticsDashboard.css';

// SSE endpoint — same base URL the NotificationBell uses
const SSE_URL = `${import.meta.env.VITE_API_URL.replace('/api', '')}/api/sse/connect`;

/**
 * ============================================================
 * AnalyticsDashboard — Recruiter Analytics Page
 * ============================================================
 *
 * Architecture:
 *   Data Layer  — two independent React Query hooks, each with
 *                 refetchInterval: 60000 (60-second auto-refresh)
 *   Visual Layer — chart components receive plain data as props;
 *                  they know nothing about fetching
 *
 * Skeleton screens are shown per-section while data loads,
 * so each chart section shows independently as data arrives.
 * ============================================================
 */

// ─── Colour palette for charts ───────────────────────────────
const PIE_COLORS = {
    open:   '#6366f1',
    closed: '#fbbf24',
    draft:  '#64748b',
};

const BAR_COLOR = '#818cf8';

// ─── Custom Tooltip for BarChart ─────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#161b2a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '0.6rem 0.9rem',
            fontSize: 13,
        }}>
            <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#818cf8' }}>
                Applications: <strong>{payload[0].value}</strong>
            </p>
        </div>
    );
};

// ─── Custom Tooltip for PieChart ─────────────────────────────
const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#161b2a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '0.6rem 0.9rem',
            fontSize: 13,
        }}>
            <p style={{ color: payload[0].payload.fill, fontWeight: 600 }}>
                {payload[0].name}
            </p>
            <p style={{ color: '#f1f5f9' }}>
                Count: <strong>{payload[0].value}</strong>
            </p>
            <p style={{ color: '#94a3b8' }}>
                {payload[0].payload.percent}
            </p>
        </div>
    );
};

// ─── Custom Legend for PieChart ───────────────────────────────
const PieLegend = ({ payload }) => (
    <ul style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        justifyContent: 'center',
        listStyle: 'none',
        padding: 0,
        marginTop: '0.5rem',
    }}>
        {payload.map((entry) => (
            <li
                key={entry.value}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
                <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: entry.color,
                    display: 'inline-block',
                    flexShrink: 0,
                }} />
                <span style={{ color: '#94a3b8' }}>
                    {entry.value} — {entry.payload.count} ({entry.payload.percent})
                </span>
            </li>
        ))}
    </ul>
);

// ─── Skeleton: Stat Card ──────────────────────────────────────
const StatCardSkeleton = () => (
    <div className="stat-card" style={{ '--card-accent': 'var(--color-surface-2)' }}>
        <div className="skeleton stat-card-skeleton-label" />
        <div className="skeleton stat-card-skeleton-value" />
    </div>
);

// ─── Skeleton: Chart ──────────────────────────────────────────
const ChartSkeleton = () => (
    <div className="skeleton chart-skeleton" />
);

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accentColor }) => (
    <div className="stat-card" style={{ '--card-accent': accentColor }}>
        <span className="stat-card-icon">{icon}</span>
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
    </div>
);

// ─── BarChart Component ───────────────────────────────────────
const ApplicationsBarChart = ({ data }) => {
    if (!data?.length) {
        return (
            <div className="chart-empty">
                <span className="chart-empty-icon">📊</span>
                <span>No application data yet</span>
            </div>
        );
    }

    // Truncate long job titles for the axis
    const chartData = data.map((job) => ({
        ...job,
        shortTitle: job.title.length > 20 ? job.title.slice(0, 18) + '…' : job.title,
    }));

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 60 }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                />
                <XAxis
                    dataKey="shortTitle"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                />
                <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar
                    dataKey="total_applications"
                    name="Applications"
                    fill={BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

// ─── PieChart Component ───────────────────────────────────────
const JobStatusPieChart = ({ summary }) => {
    const total = (summary?.open_jobs ?? 0)
                + (summary?.closed_jobs ?? 0)
                + (summary?.draft_jobs ?? 0);

    if (total === 0) {
        return (
            <div className="chart-empty">
                <span className="chart-empty-icon">🥧</span>
                <span>No jobs posted yet</span>
            </div>
        );
    }

    const pct = (n) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

    const pieData = [
        { name: 'Open',   value: summary.open_jobs,   count: summary.open_jobs,   percent: pct(summary.open_jobs),   fill: PIE_COLORS.open   },
        { name: 'Closed', value: summary.closed_jobs, count: summary.closed_jobs, percent: pct(summary.closed_jobs), fill: PIE_COLORS.closed },
        { name: 'Draft',  value: summary.draft_jobs,  count: summary.draft_jobs,  percent: pct(summary.draft_jobs),  fill: PIE_COLORS.draft  },
    ].filter((d) => d.value > 0);

    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={pieData}
                    cx="50%"
                    cy="44%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                >
                    {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend content={<PieLegend />} />
            </PieChart>
        </ResponsiveContainer>
    );
};

// ─── Main Page ────────────────────────────────────────────────
const AnalyticsDashboard = () => {
    const navigate  = useNavigate();
    const dispatch  = useDispatch();
    const user      = useSelector((state) => state.auth.user);

    // ── Data Layer ────────────────────────────────────────────
    // Each query has refetchInterval: 60000 → background auto-refresh every 60s.
    // Redis TTL is 300s (5 min), safely above the 60s interval.

    const {
        data: summaryRes,
        isLoading: isSummaryLoading,
        isError: isSummaryError,
    } = useQuery({
        queryKey: ['recruiter-analytics-summary'],
        queryFn: getRecruiterSummary,
        refetchInterval: 60000,
    });

    const {
        data: appsRes,
        isLoading: isAppsLoading,
        isError: isAppsError,
    } = useQuery({
        queryKey: ['recruiter-analytics-applications'],
        queryFn: getRecruiterJobApplications,
        refetchInterval: 60000,
    });

    const summary = summaryRes?.data  || null;
    const jobs    = appsRes?.data     || [];

    // Derived totals for stat cards (computed from the applications breakdown)
    const totalApplications = jobs.reduce((sum, j) => sum + j.total_applications, 0);
    const totalShortlisted  = jobs.reduce((sum, j) => sum + j.shortlisted, 0);
    const totalHired        = jobs.reduce((sum, j) => sum + j.hired, 0);

    // ── SSE: analytics_updated ───────────────────────────────────────────────────
    // The recruiter.service fires { type: 'analytics_updated' } over SSE when
    // a candidate is moved to 'hired'. We listen here and immediately invalidate
    // both analytics queries — React Query refetches them in the background.
    // Result: the dashboard updates instantly instead of waiting up to 60s.
    //
    // HOW PER-QUERY LOADING STATES HELP HERE:
    //   Because each query (summary / applications) has its own isLoading state,
    //   only the refetching section shows a skeleton while the other stays visible.
    //   The user doesn't see a full-page spinner — just the affected section refreshes.
    const queryClient = useQueryClient();
    const sseEvents   = useSSE(SSE_URL);

    useEffect(() => {
        if (sseEvents.length === 0) return;
        const latest = sseEvents[0];

        if (latest.type === 'analytics_updated') {
            // Immediately pull fresh data — bypasses the 60s refetchInterval
            queryClient.invalidateQueries({ queryKey: ['recruiter-analytics-summary'] });
            queryClient.invalidateQueries({ queryKey: ['recruiter-analytics-applications'] });
        }
    }, [sseEvents, queryClient]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="analytics-dashboard-page">

            {/* ── Top Navigation ── */}
            <nav className="recruiter-nav">
                <div className="nav-brand">
                    <span className="logo">HireAI</span>
                    <span className="portal-badge">Analytics</span>
                </div>
                <div className="nav-actions">
                    <Link to="/recruiter/dashboard" className="nav-link">← Dashboard</Link>
                    <Link to="/jobs"                className="nav-link">Browse Jobs</Link>
                    <NotificationBell />
                    <div className="user-profile">
                        <span className="user-name">{user?.name}</span>
                        <button id="analytics-logout-btn" className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Main ── */}
            <main className="analytics-main">

                {/* Page Header */}
                <div className="analytics-page-header">
                    <div>
                        <h1>Analytics Dashboard</h1>
                        <p>Live insights from your recruitment pipeline</p>
                    </div>
                    <div className="refresh-indicator" title="Dashboard auto-refreshes every 60 seconds">
                        <span className="refresh-dot" />
                        Auto-refreshes every 60s
                    </div>
                </div>

                {/* Error banners (per-query, non-blocking) */}
                {isSummaryError && (
                    <div className="analytics-error-banner" role="alert">
                        ⚠️ Could not load summary stats. Retrying automatically…
                    </div>
                )}
                {isAppsError && (
                    <div className="analytics-error-banner" role="alert">
                        ⚠️ Could not load application breakdown. Retrying automatically…
                    </div>
                )}

                {/* ── Stat Cards Row ── */}
                <div className="stat-cards-grid">
                    {isSummaryLoading || isAppsLoading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <StatCard
                                id="stat-total-jobs"
                                label="Total Jobs Posted"
                                value={summary?.total_jobs ?? 0}
                                icon="💼"
                                accentColor="var(--color-primary)"
                            />
                            <StatCard
                                id="stat-total-applications"
                                label="Total Applications"
                                value={totalApplications}
                                icon="📋"
                                accentColor="var(--color-accent)"
                            />
                            <StatCard
                                id="stat-total-shortlisted"
                                label="Total Shortlisted"
                                value={totalShortlisted}
                                icon="⭐"
                                accentColor="#a78bfa"
                            />
                            <StatCard
                                id="stat-total-hired"
                                label="Total Hired"
                                value={totalHired}
                                icon="🎉"
                                accentColor="var(--color-success)"
                            />
                        </>
                    )}
                </div>

                {/* ── Charts Row ── */}
                <div className="charts-grid">

                    {/* BarChart — Applications per Job */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h2 className="chart-card-title">Applications per Job</h2>
                            <p className="chart-card-subtitle">Total applications received for each posted job</p>
                        </div>
                        {isAppsLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <ApplicationsBarChart data={jobs} />
                        )}
                    </div>

                    {/* PieChart — Jobs by Status */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h2 className="chart-card-title">Jobs by Status</h2>
                            <p className="chart-card-subtitle">Distribution of open, closed, and draft job postings</p>
                        </div>
                        {isSummaryLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <JobStatusPieChart summary={summary} />
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AnalyticsDashboard;
