import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import {
    getAdminUsers,
    getAdminJobs,
    updateJobStatus,
    getPlatformStats,
} from '../../services/adminService';
import NotificationBell from '../../Components/NotificationBell';
import { logoutUser } from '../../store/slices/authSlice';
import './AdminDashboard.css';

/**
 * ============================================================
 * AdminDashboard — Admin-only panel with three tabs
 * ============================================================
 *
 * ROUTE PROTECTION (Exercise 5 — two layers):
 *   Layer 1 (frontend): <ProtectedRoute requiredRole="admin"> in App.jsx
 *                       → non-admins are redirected to /dashboard
 *   Layer 2 (backend):  rbacMiddleware(['admin']) on /api/users
 *                       rbacMiddleware(['admin']) on /api/analytics/platform
 *
 * UI PATTERN (hiding the nav link):
 *   {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
 *   This hides the link for UX only. It is NOT a security measure.
 *
 * useInfiniteQuery vs useQuery (Exercise 2):
 *   useQuery       → single page, numbered pagination (page 1, 2, 3…)
 *   useInfiniteQuery → accumulates pages, "load more" pattern
 *     - data.pages   : array of page responses (each is { users, total, page, totalPages })
 *     - fetchNextPage(): loads page+1 and APPENDS it to data.pages
 *     - hasNextPage  : true if getNextPageParam returned a non-undefined value
 *     - data.pages.flatMap(p => p.users) → single flat array for rendering
 *
 * Why is the flat array needed?
 *   data.pages is [[pageResponse1], [pageResponse2], …]
 *   Each response contains its own users array.
 *   flatMap extracts every users array and merges them into one.
 * ============================================================
 */

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'users',  label: 'Users',          icon: '👥' },
    { id: 'jobs',   label: 'Jobs',           icon: '💼' },
    { id: 'stats',  label: 'Platform Stats', icon: '📊' },
];

const JOB_STATUSES = ['open', 'closed', 'draft'];

// ─── Skeleton rows ─────────────────────────────────────────────────────────────
const TableSkeletons = ({ rows = 5 }) => (
    <div style={{ padding: '0.75rem 1rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
        ))}
    </div>
);

// ─── Users Tab ─────────────────────────────────────────────────────────────────
const UsersTab = () => {
    /**
     * useInfiniteQuery — "Load More" pagination
     *
     * queryFn receives { pageParam } injected by React Query.
     * pageParam starts at the initialPageParam value (1).
     *
     * getNextPageParam(lastPage):
     *   - lastPage = the most recent page's response object
     *   - If page < totalPages → return page+1 (React Query uses this as the next pageParam)
     *   - If page >= totalPages → return undefined (signals hasNextPage = false)
     *
     * This is where the "next page" info comes from: the last response.
     * The backend tells us how many total pages exist; we derive whether there
     * is a next page from that, rather than the frontend guessing.
     */
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['admin', 'users'],
        queryFn: getAdminUsers,
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    });

    // Flatten data.pages: each element is one page response; we want all users in one array.
    // data?.pages is Array<{ users, total, page, totalPages }>
    // flatMap extracts the users array from each and merges them.
    const allUsers = data?.pages.flatMap((page) => page.users) ?? [];
    const totalUsers = data?.pages[0]?.total ?? 0;

    if (isError) {
        return <div className="admin-error">⚠️ Failed to load users. Please try again.</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Showing {allUsers.length} of {totalUsers} users
            </div>

            <div className="admin-table-wrapper">
                {isLoading ? (
                    <TableSkeletons rows={8} />
                ) : allUsers.length === 0 ? (
                    <div className="admin-empty">
                        <span className="admin-empty-icon">👤</span>
                        No users found
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td style={{ color: 'var(--color-text-muted)' }}>#{user.id}</td>
                                        <td style={{ fontWeight: 600 }}>{user.name}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>{user.email}</td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Load More — calls fetchNextPage(), disabled when no more pages */}
                        <div className="load-more-row">
                            <button
                                id="load-more-users-btn"
                                className="load-more-btn"
                                onClick={() => fetchNextPage()}
                                disabled={!hasNextPage || isFetchingNextPage}
                            >
                                {isFetchingNextPage
                                    ? 'Loading…'
                                    : hasNextPage
                                        ? 'Load More Users'
                                        : 'All users loaded'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Jobs Tab ──────────────────────────────────────────────────────────────────
const JobsTab = () => {
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['admin', 'jobs'],
        queryFn: getAdminJobs,
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.pagination.page < lastPage.pagination.totalPages
                ? lastPage.pagination.page + 1
                : undefined,
    });

    const allJobs = data?.pages.flatMap((page) => page.jobs) ?? [];
    const totalJobs = data?.pages[0]?.pagination?.total ?? 0;

    // Mutation: admin changes a job's status
    // onSuccess: invalidate the admin jobs query so the table re-fetches with fresh data
    const statusMutation = useMutation({
        mutationFn: ({ jobId, status }) => updateJobStatus(jobId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
        },
        onError: (err) => {
            alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
        },
    });

    if (isError) {
        return <div className="admin-error">⚠️ Failed to load jobs. Please try again.</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Showing {allJobs.length} of {totalJobs} jobs
            </div>

            <div className="admin-table-wrapper">
                {isLoading ? (
                    <TableSkeletons rows={8} />
                ) : allJobs.length === 0 ? (
                    <div className="admin-empty">
                        <span className="admin-empty-icon">💼</span>
                        No jobs found
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Company</th>
                                    <th>Type</th>
                                    <th>Applications</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allJobs.map((job) => (
                                    <tr key={job.id}>
                                        <td style={{ color: 'var(--color-text-muted)' }}>#{job.id}</td>
                                        <td style={{ fontWeight: 600, maxWidth: 220 }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {job.title}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                {job.location}
                                            </div>
                                        </td>
                                        <td>{job.company}</td>
                                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            {job.job_type}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                                                {job.application_count ?? 0}
                                            </span>
                                        </td>
                                        <td>
                                            {/* Admin can change status directly from this table */}
                                            <select
                                                id={`job-status-select-${job.id}`}
                                                className="status-select"
                                                value={job.status}
                                                disabled={statusMutation.isPending}
                                                onChange={(e) =>
                                                    statusMutation.mutate({
                                                        jobId: job.id,
                                                        status: e.target.value,
                                                    })
                                                }
                                            >
                                                {JOB_STATUSES.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="load-more-row">
                            <button
                                id="load-more-jobs-btn"
                                className="load-more-btn"
                                onClick={() => fetchNextPage()}
                                disabled={!hasNextPage || isFetchingNextPage}
                            >
                                {isFetchingNextPage
                                    ? 'Loading…'
                                    : hasNextPage
                                        ? 'Load More Jobs'
                                        : 'All jobs loaded'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Platform Stats Tab ────────────────────────────────────────────────────────
const PlatformStatsTab = () => {
    const { data: stats, isLoading, isError } = useQuery({
        queryKey: ['admin', 'platform-stats'],
        queryFn: getPlatformStats,
        staleTime: 60_000,
    });

    if (isError) {
        return <div className="admin-error">⚠️ Failed to load platform stats.</div>;
    }

    const StatCard = ({ label, value, icon, accent }) => (
        <div className="platform-stat-card" style={{ '--card-accent': accent }}>
            <span className="psc-icon">{icon}</span>
            <span className="psc-label">{label}</span>
            <span className="psc-value">{isLoading ? '—' : value}</span>
        </div>
    );

    return (
        <div>
            {/* Summary Stat Cards */}
            <div className="platform-stats-grid">
                <StatCard
                    label="Total Jobs"
                    value={stats?.totalJobs ?? 0}
                    icon="💼"
                    accent="var(--color-primary)"
                />
                <StatCard
                    label="Total Applications"
                    value={stats?.totalApplications ?? 0}
                    icon="📋"
                    accent="var(--color-accent)"
                />
                <StatCard
                    label="Assessment Attempts"
                    value={stats?.totalAssessmentAttempts ?? 0}
                    icon="🧠"
                    accent="#fbbf24"
                />
                <StatCard
                    label="Total Users"
                    value={stats?.usersByRole?.reduce((sum, r) => sum + r.count, 0) ?? 0}
                    icon="👥"
                    accent="var(--color-success)"
                />
            </div>

            {/* Users by Role breakdown */}
            <div className="admin-table-wrapper">
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Users by Role</h3>
                </div>
                {isLoading ? (
                    <TableSkeletons rows={3} />
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th style={{ textAlign: 'right' }}>Count</th>
                                <th style={{ textAlign: 'right' }}>Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats?.usersByRole ?? []).map((row) => {
                                const total = stats.usersByRole.reduce((s, r) => s + r.count, 0);
                                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                                return (
                                    <tr key={row.role}>
                                        <td>
                                            <span className={`role-badge ${row.role}`}>{row.role}</span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.count}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                                            {pct}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate   = useNavigate();
    const dispatch   = useDispatch();
    const user       = useSelector((state) => state.auth.user);
    const [activeTab, setActiveTab] = useState('users');

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'users':  return <UsersTab />;
            case 'jobs':   return <JobsTab />;
            case 'stats':  return <PlatformStatsTab />;
            default:       return null;
        }
    };

    return (
        <div className="admin-page">

            {/* ── Navigation ── */}
            <nav className="recruiter-nav">
                <div className="nav-brand">
                    <span className="logo">HireAI</span>
                    <span className="portal-badge" style={{ color: '#f87171' }}>Admin</span>
                </div>
                <div className="nav-actions">
                    <Link to="/dashboard"  className="nav-link">Dashboard</Link>
                    <Link to="/jobs"       className="nav-link">Jobs</Link>
                    <NotificationBell />
                    <div className="user-profile">
                        <span className="user-name">{user?.name}</span>
                        <button id="admin-logout-btn" className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="admin-main">

                {/* Page Header */}
                <div className="admin-page-header">
                    <h1>Admin Panel</h1>
                    <p>Platform-wide management — users, jobs, and analytics</p>
                </div>

                {/* Tab Bar */}
                <div className="admin-tab-bar" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`admin-tab-${tab.id}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`admin-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Active Tab Content */}
                <div role="tabpanel">
                    {renderTab()}
                </div>

            </main>
        </div>
    );
};

export default AdminDashboard;
