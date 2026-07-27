import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getRecruiterJobs } from '../../services/recruiterService';
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

    const jobs = jobsResponse?.data || [];
    const analytics = analyticsResponse?.data || { total_jobs: 0, open_jobs: 0, closed_jobs: 0 };

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
                    <Link to="/jobs" className="primary-btn">
                        + View All Listings
                    </Link>
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
                                        <button className="view-pipeline-btn">
                                            View Pipeline →
                                        </button>
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
