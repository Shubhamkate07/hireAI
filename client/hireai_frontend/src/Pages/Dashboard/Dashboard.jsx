/**
 * Dashboard.jsx — Main landing page after login
 *
 * Added:
 *   - A proper top navbar with user info and the NotificationBell component
 *   - The bell connects to SSE on mount automatically
 */

import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice";
import NotificationBell from "../../Components/NotificationBell";
import "./Dashboard.css";

const Dashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate("/login");
    };

    return (
        <div className="dashboard-page">

            {/* ── Navbar ───────────────────────────────────────────────── */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav-left">
                    <span className="dashboard-logo">HireAI</span>
                </div>

                <div className="dashboard-nav-right">
                    {/* Links */}
                    <Link to="/jobs"    className="nav-link">Jobs</Link>
                    <Link to="/profile" className="nav-link">Profile</Link>

                    {/* Recruiter Links — visible for recruiters & admins */}
                    {(user?.role === 'recruiter' || user?.role === 'admin') && (
                        <>
                            <Link
                                to="/recruiter/dashboard"
                                id="recruiter-nav-link"
                                className="nav-link"
                                style={{ color: '#6366f1', fontWeight: 600 }}
                            >
                                📊 Recruiter Portal
                            </Link>
                            <Link
                                to="/recruiter/analytics"
                                id="recruiter-analytics-nav-link"
                                className="nav-link"
                                style={{ color: '#8b5cf6', fontWeight: 600 }}
                            >
                                📈 Analytics
                            </Link>
                        </>
                    )}

                    {/* Admin link — UX-only visibility gate.
                        Security enforced by ProtectedRoute + backend RBAC. */}
                    {user?.role === 'admin' && (
                        <Link
                            to="/admin"
                            id="admin-nav-link"
                            className="nav-link"
                            style={{ color: '#f87171', fontWeight: 700 }}
                        >
                            ⚙️ Admin
                        </Link>
                    )}

                    {/* 🔔 Notification Bell — SSE connects here on mount */}
                    <NotificationBell />

                    {/* User avatar + logout */}
                    <div className="nav-user">
                        <span className="nav-user-name">{user?.name}</span>
                        <button
                            id="logout-btn"
                            className="nav-logout-btn"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

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
                        Use the notification bell in the top-right to receive real-time
                        updates. Try applying to a job — your recruiter's status updates
                        will appear instantly without a page refresh.
                    </p>

                    {/* Recruiter Quick Actions */}
                    {(user?.role === 'recruiter' || user?.role === 'admin') && (
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link
                                to="/recruiter/dashboard"
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                📊 Open Recruiter Dashboard →
                            </Link>
                            <Link
                                to="/recruiter/analytics"
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: '#7c3aed',
                                    color: '#ffffff',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                📈 View Application Analytics →
                            </Link>
                        </div>
                    )}
                </div>

                <div className="dashboard-info-grid">
                    <div className="info-card">
                        <h3>📡 SSE Connected</h3>
                        <p>
                            The bell icon connects via Server-Sent Events on load.
                            Look for the small green pulsing dot — that means the
                            real-time channel is alive.
                        </p>
                    </div>
                    <div className="info-card">
                        <h3>⚡ Optimistic UI</h3>
                        <p>
                            Clicking a notification marks it read instantly in the UI,
                            before the API call completes. If the call fails, it rolls
                            back automatically.
                        </p>
                    </div>
                    <div className="info-card">
                        <h3>🔄 Auto-Reconnect</h3>
                        <p>
                            Drop your network, come back — EventSource reconnects
                            automatically. No manual retry code needed.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
