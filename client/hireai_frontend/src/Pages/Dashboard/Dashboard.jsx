/**
 * Dashboard.jsx — Main landing page after login
 * The shared <Navbar /> is rendered by AppLayout (see App.jsx).
 */

import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import "./Dashboard.css";

const Dashboard = () => {
    const user = useSelector((state) => state.auth.user);

    return (
        <div className="dashboard-page">

            {/* ── Page body ────────────────────────────────────────────── */}
            <main className="dashboard-body">
                <div className="dashboard-welcome-card">
                    <h1 className="dashboard-welcome-title">
                        Welcome back, <span className="dashboard-username">{user?.name}</span> 👋
                    </h1>
                    <p className="dashboard-role-badge">
                        Signed in as <strong>{user?.role}</strong>
                    </p>
                    <p className="dashboard-subtitle">
                        Your AI-powered hiring hub. Browse open roles, track your applications,
                        and get real-time status updates delivered instantly.
                    </p>

                    {/* Quick-action buttons — recruiter only. Recruiter pages are scoped to
                        the user's own postings, so they'd be empty for an admin. */}
                    {user?.role === 'recruiter' && (
                        <div className="dashboard-quick-actions">
                            <Link to="/recruiter/dashboard" className="dashboard-action-btn dashboard-action-btn--primary">
                                📊 Manage My Job Postings →
                            </Link>
                            <Link to="/recruiter/analytics" className="dashboard-action-btn dashboard-action-btn--secondary">
                                📈 View Application Analytics →
                            </Link>
                        </div>
                    )}

                    {user?.role === 'admin' && (
                        <div className="dashboard-quick-actions" style={{ marginTop: '10px' }}>
                            <Link to="/admin" className="dashboard-action-btn dashboard-action-btn--danger">
                                ⚙️ Admin Control Center →
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick stats / features grid */}
                <div className="dashboard-info-grid">
                    <Link to="/jobs" className="info-card info-card--link">
                        <span className="info-card-icon">💼</span>
                        <h3>Browse Jobs</h3>
                        <p>Explore open positions and apply in one click. AI matches you to the best fit.</p>
                    </Link>
                    <Link to="/profile" className="info-card info-card--link">
                        <span className="info-card-icon">👤</span>
                        <h3>Your Profile</h3>
                        <p>Keep your profile up to date to improve your match score and visibility to recruiters.</p>
                    </Link>
                    <div className="info-card">
                        <span className="info-card-icon">🔔</span>
                        <h3>Real-Time Alerts</h3>
                        <p>Watch the 🔔 bell in the top bar — application status changes show up instantly, no refresh needed.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
