import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { getPlatformStats, getAdminAssessments } from '../../services/adminService';
import NotificationBell from '../../Components/NotificationBell';
import { logoutUser } from '../../store/slices/authSlice';
import './AdminDashboard.css';

/**
 * ============================================================
 * AdminDashboard.jsx — Main Admin Landing Page
 * ============================================================
 * Features 4 Quick-Action Metric Cards that navigate directly to
 * dedicated management modules:
 *   1. 👥 Users Management (/admin/users)
 *   2. 💼 Jobs Management (/admin/jobs)
 *   3. 📝 Assessments Management (/admin/assessments)
 *   4. 📋 System Activity Log (/admin/activity)
 * ============================================================
 */

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector((state) => state.auth.user);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    // Platform stats (users count, total jobs, total apps)
    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['admin', 'platform-stats'],
        queryFn: getPlatformStats,
    });

    // Assessments list to get total assessment count
    const { data: assessments } = useQuery({
        queryKey: ['admin', 'assessments-count'],
        queryFn: getAdminAssessments,
    });

    let candidatesCount = 0;
    let recruitersCount = 0;
    let adminsCount = 0;

    if (Array.isArray(stats?.usersByRole)) {
        stats.usersByRole.forEach((r) => {
            if (r.role === 'candidate') candidatesCount = Number(r.count || 0);
            if (r.role === 'recruiter') recruitersCount = Number(r.count || 0);
            if (r.role === 'admin') adminsCount = Number(r.count || 0);
        });
    } else if (stats?.usersByRole) {
        candidatesCount = Number(stats.usersByRole.candidate || 0);
        recruitersCount = Number(stats.usersByRole.recruiter || 0);
        adminsCount = Number(stats.usersByRole.admin || 0);
    }

    const totalUsers = candidatesCount + recruitersCount + adminsCount;
    const totalJobs = stats?.totalJobs || 0;
    const totalAssessments = assessments?.length || 0;

    return (
        <div className="admin-page-container">
            {/* Top Navigation Bar */}
            <nav className="dashboard-nav" style={{ marginBottom: '24px' }}>
                <div className="dashboard-nav-left">
                    <span className="dashboard-logo">HireAI Admin</span>
                </div>

                <div className="dashboard-nav-right">
                    <Link to="/dashboard" className="nav-link">Main Portal</Link>
                    <Link to="/jobs" className="nav-link">Jobs View</Link>
                    <Link to="/admin" className="nav-link" style={{ color: '#f87171', fontWeight: 700 }}>
                        ⚙️ Admin
                    </Link>
                    <NotificationBell />
                    <div className="nav-user">
                        <span className="nav-user-name">{currentUser?.name}</span>
                        <button onClick={handleLogout} className="nav-logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Header Banner */}
            <div className="admin-header-banner">
                <h1 className="admin-page-title">⚙️ Admin Control Center</h1>
                <p className="admin-page-subtitle">
                    System-wide platform overview, security governance, job overrides, and activity monitoring.
                </p>
            </div>

            {/* Quick Action Navigation Grid (4 Clickable Cards) */}
            <div className="admin-quick-cards-grid">
                {/* Card 1: Users */}
                <div className="admin-stat-card card-users" onClick={() => navigate('/admin/users')}>
                    <div className="stat-icon">👥</div>
                    <div className="stat-details">
                        <h2 className="stat-count">{isStatsLoading ? '...' : totalUsers} Users</h2>
                        <p className="stat-subtitle">Manage roles & activate/deactivate accounts</p>
                    </div>
                    <span className="card-arrow">→</span>
                </div>

                {/* Card 2: Jobs */}
                <div className="admin-stat-card card-jobs" onClick={() => navigate('/admin/jobs')}>
                    <div className="stat-icon">💼</div>
                    <div className="stat-details">
                        <h2 className="stat-count">{isStatsLoading ? '...' : totalJobs} Jobs</h2>
                        <p className="stat-subtitle">Override job status & hard delete listings</p>
                    </div>
                    <span className="card-arrow">→</span>
                </div>

                {/* Card 3: Assessments */}
                <div className="admin-stat-card card-assessments" onClick={() => navigate('/admin/assessments')}>
                    <div className="stat-icon">📝</div>
                    <div className="stat-details">
                        <h2 className="stat-count">{totalAssessments} Assessments</h2>
                        <p className="stat-subtitle">Full question editor & answer key manager</p>
                    </div>
                    <span className="card-arrow">→</span>
                </div>

                {/* Card 4: Activity Log */}
                <div className="admin-stat-card card-activity" onClick={() => navigate('/admin/activity')}>
                    <div className="stat-icon">📋</div>
                    <div className="stat-details">
                        <h2 className="stat-count">Activity Log</h2>
                        <p className="stat-subtitle">Real-time system audit & monitoring stream</p>
                    </div>
                    <span className="card-arrow">→</span>
                </div>
            </div>

            {/* Platform Snapshot Section */}
            <div className="admin-card" style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '0 0 16px' }}>
                    📊 Platform Overview Snapshot
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="snapshot-box">
                        <span className="snapshot-title">Candidates</span>
                        <span className="snapshot-val">{candidatesCount}</span>
                    </div>
                    <div className="snapshot-box">
                        <span className="snapshot-title">Recruiters</span>
                        <span className="snapshot-val">{recruitersCount}</span>
                    </div>
                    <div className="snapshot-box">
                        <span className="snapshot-title">Admins</span>
                        <span className="snapshot-val">{adminsCount}</span>
                    </div>
                    <div className="snapshot-box">
                        <span className="snapshot-title">Total Applications</span>
                        <span className="snapshot-val">{stats?.totalApplications || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
