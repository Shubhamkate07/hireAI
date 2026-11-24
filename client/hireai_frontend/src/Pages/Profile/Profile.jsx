/**
 * Profile.jsx — User profile page
 * Shows the logged-in user's details, role, and account info.
 */

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
    const user = useSelector((state) => state.auth.user);

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':     return { bg: 'rgba(248,113,113,0.15)', color: '#f87171', border: 'rgba(248,113,113,0.3)' };
            case 'recruiter': return { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)' };
            default:          return { bg: 'rgba(52,211,153,0.15)',  color: '#34d399', border: 'rgba(52,211,153,0.3)' };
        }
    };

    const roleStyle = getRoleColor(user?.role);
    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <div className="profile-page">

            <main className="profile-main">
                {/* Profile Card */}
                <div className="profile-card">
                    {/* Avatar */}
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar">{initials}</div>
                        <div className="profile-avatar-ring" />
                    </div>

                    {/* Name & Role */}
                    <h1 className="profile-name">{user?.name || '—'}</h1>
                    <span
                        className="profile-role-badge"
                        style={{
                            background: roleStyle.bg,
                            color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`,
                        }}
                    >
                        {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
                    </span>

                    {/* Info Grid */}
                    <div className="profile-info-grid">
                        <div className="profile-info-item">
                            <span className="profile-info-label">📧 Email</span>
                            <span className="profile-info-value">{user?.email || '—'}</span>
                        </div>
                        <div className="profile-info-item">
                            <span className="profile-info-label">🆔 User ID</span>
                            <span className="profile-info-value">#{user?.id || '—'}</span>
                        </div>
                        <div className="profile-info-item">
                            <span className="profile-info-label">🎭 Role</span>
                            <span className="profile-info-value" style={{ color: roleStyle.color, fontWeight: 700 }}>
                                {user?.role || '—'}
                            </span>
                        </div>
                        <div className="profile-info-item">
                            <span className="profile-info-label">✅ Status</span>
                            <span className="profile-info-value" style={{ color: '#34d399', fontWeight: 700 }}>
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Quick links */}
                    <div className="profile-actions">
                        <Link to="/jobs" className="profile-action-btn profile-action-btn--primary">
                            💼 Browse Jobs
                        </Link>
                        {user?.role === 'recruiter' && (
                            <Link to="/recruiter/dashboard" className="profile-action-btn profile-action-btn--accent">
                                📊 My Job Postings
                            </Link>
                        )}
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="profile-action-btn profile-action-btn--danger">
                                ⚙️ Admin Center
                            </Link>
                        )}
                    </div>
                </div>

                {/* Feature highlight cards */}
                <div className="profile-feature-grid">
                    <div className="profile-feature-card">
                        <span className="profile-feature-icon">🔒</span>
                        <h3>Account Security</h3>
                        <p>Your account is protected with role-based access control. Only admins can change your role.</p>
                    </div>
                    <div className="profile-feature-card">
                        <span className="profile-feature-icon">🔔</span>
                        <h3>Real-Time Alerts</h3>
                        <p>Application status updates are delivered instantly via Server-Sent Events to your bell icon.</p>
                    </div>
                    <div className="profile-feature-card">
                        <span className="profile-feature-icon">🤖</span>
                        <h3>AI Matching</h3>
                        <p>HireAI uses your profile data to intelligently rank and match you with the best job openings.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
