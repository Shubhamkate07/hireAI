import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getRecruiterJobs, getRecruiterAssessments } from '../../services/recruiterService';
import api from '../../services/api';
import NotificationBell from '../../Components/NotificationBell';
import { logoutUser } from '../../store/slices/authSlice';
import './RecruiterDashboardPage.css';

/**
 * RecruiterDashboardPage (Exercise 1)
 *
 * Displays:
 *   1. Recruiter analytics summary cards (total jobs, open jobs, closed jobs)
 *   2. List of posted jobs with live application count badges
 *   3. Navigation to the pipeline view per job
 */
const RecruiterDashboardPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);

    // Fetch recruiter's jobs with application count
    const {
        data: jobsResponse,
        isLoading: isJobsLoading,
        isError: isJobsError,
        error: jobsError
    } = useQuery({
        queryKey: ['recruiter-jobs'],
        queryFn: getRecruiterJobs,
    });

    // Fetch recruiter analytics summary (from Analytics API)
    const { data: analyticsResponse } = useQuery({
        queryKey: ['recruiter-analytics-summary'],
        queryFn: async () => {
            const res = await api.get('/analytics/recruiter');
            return res.data;
        },
    });

    // Fetch recruiter's assessments list
    const {
        data: assessmentsResponse,
        isLoading: isAssessmentsLoading,
    } = useQuery({
        queryKey: ['recruiter-assessments'],
        queryFn: getRecruiterAssessments,
    });

    const jobs = jobsResponse?.data || [];
    const analytics = analyticsResponse?.data || { total_jobs: 0, open_jobs: 0, closed_jobs: 0 };
    const recruiterAssessments = assessmentsResponse?.data || [];

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="recruiter-dashboard-page">
            {/* Top Navigation Bar */}
            <nav className="recruiter-nav">
                <div className="nav-brand">
                    <span className="logo">HireAI</span>
                    <span className="portal-badge">Recruiter Portal</span>
                </div>
                <div className="nav-actions">
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    <Link to="/jobs" className="nav-link">Browse Jobs</Link>
                    <Link to="/recruiter/analytics" className="nav-link" style={{ color: 'var(--color-accent)' }}>📊 Analytics</Link>
                    <NotificationBell />
                    <div className="user-profile">
                        <span className="user-name">{user?.name}</span>
                        <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="recruiter-main">
                {/* Header Banner */}
                <div className="page-header">
                    <div>
                        <h1>Recruiter Dashboard</h1>
                        <p>Manage your posted jobs and candidate application pipelines</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Link to="/recruiter/assessments/new" className="primary-btn" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            📝 + Create Assessment
                        </Link>
                        <Link to="/jobs" className="primary-btn">
                            + View All Listings
                        </Link>
                    </div>
                </div>

                {/* Analytics Summary Cards */}
                <div className="analytics-summary-grid">
                    <div className="summary-card">
                        <span className="card-label">Total Jobs Posted</span>
                        <span className="card-value">{analytics.total_jobs || jobs.length}</span>
                    </div>
                    <div className="summary-card highlight-open">
                        <span className="card-label">Active Open Jobs</span>
                        <span className="card-value">{analytics.open_jobs}</span>
                    </div>
                    <div className="summary-card highlight-closed">
                        <span className="card-label">Closed Jobs</span>
                        <span className="card-value">{analytics.closed_jobs}</span>
                    </div>
                </div>

                {/* Job Listings Section */}
                <section className="jobs-section">
                    <h2>Your Posted Jobs</h2>

                    {isJobsLoading ? (
                        <div className="loader-container">
                            <div className="page-loader-spinner" />
                            <p>Loading your jobs...</p>
                        </div>
                    ) : isJobsError ? (
                        <div className="error-box">
                            <p>Error loading jobs: {jobsError?.message || 'Failed to fetch'}</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="empty-box">
                            <p>You haven't posted any jobs yet.</p>
                        </div>
                    ) : (
                        <div className="recruiter-jobs-grid">
                            {jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="recruiter-job-card"
                                    onClick={() => navigate(`/recruiter/jobs/${job.id}/pipeline`)}
                                >
                                    <div className="card-header">
                                        <h3>{job.title}</h3>
                                        <span className={`status-badge status-${job.status}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="company-info">{job.company} • {job.location}</p>
                                    <div className="card-footer">
                                        <span className="app-count-badge">
                                            👥 {job.application_count ?? 0} Applicants
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="view-pipeline-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/recruiter/assessments/new?job_id=${job.id}`);
                                                }}
                                                style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}
                                            >
                                                📝 + Assessment
                                            </button>
                                            <button className="view-pipeline-btn">
                                                View Pipeline →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Technical Assessments Section */}
                <section className="jobs-section" style={{ marginTop: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>Your Technical Assessments</h2>
                        <Link to="/recruiter/assessments/new" className="primary-btn" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', fontSize: '0.85rem' }}>
                            + Create Assessment
                        </Link>
                    </div>

                    {isAssessmentsLoading ? (
                        <div className="loader-container">
                            <div className="page-loader-spinner" />
                            <p>Loading your assessments...</p>
                        </div>
                    ) : recruiterAssessments.length === 0 ? (
                        <div className="empty-box">
                            <p>No assessments created yet. Click "+ Create Assessment" to build one.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recruiterAssessments.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}
                                >
                                    <div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0f172a' }}>
                                            📝 {item.title}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                                            <span>💼 {item.job_title ? `Linked to: ${item.job_title}` : 'Standalone Assessment'}</span>
                                            <span>⏱️ {item.time_limit_minutes} min</span>
                                            <span>❓ {item.question_count ?? 0} questions</span>
                                            <span>👥 {item.attempt_count ?? 0} attempts</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Link
                                            to={`/recruiter/assessments/${item.id}/edit`}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                fontWeight: '600',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            ✏️ Edit
                                        </Link>
                                        <Link
                                            to={`/assessments/${item.id}/leaderboard`}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'linear-gradient(135deg, #0f172a, #334155)',
                                                color: '#fbbf24',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                fontWeight: '700',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            🏆 Leaderboard
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default RecruiterDashboardPage;
