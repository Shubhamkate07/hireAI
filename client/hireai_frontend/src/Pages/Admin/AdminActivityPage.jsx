import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getActivityLog } from '../../services/adminService';
import './AdminDashboard.css';

const AdminActivityPage = () => {
    const [typeFilter, setTypeFilter] = useState('all');

    const { data: activityLogs = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'activity', typeFilter],
        queryFn: () => getActivityLog({ page: 1, limit: 100, type: typeFilter }),
    });

    const getEventTypeBadge = (type) => {
        switch (type) {
            case 'application':
                return { label: 'Application', bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' };
            case 'assessment':
                return { label: 'Assessment', bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' };
            case 'registration':
                return { label: 'Registration', bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' };
            case 'job_posted':
                return { label: 'Job Posted', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
            default:
                return { label: type, bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
        }
    };

    return (
        <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <Link to="/admin" className="admin-back-link">← Back to Admin Overview</Link>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="admin-page-title">📋 System Activity Log</h1>
                        <p className="admin-page-subtitle">Real-time audit log of candidate applications, test submissions, registrations, and job postings.</p>
                    </div>
                    <button onClick={() => refetch()} className="btn-action btn-view" style={{ padding: '8px 16px' }}>
                        🔄 Refresh Log
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="admin-filter-bar">
                <div className="admin-filter-group">
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Filter Event Type:</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="admin-select"
                    >
                        <option value="all">All Events</option>
                        <option value="application">Applications</option>
                        <option value="assessment">Assessment Submissions</option>
                        <option value="registration">User Registrations</option>
                        <option value="job_posted">Job Postings</option>
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    Showing {activityLogs.length} events
                </div>
            </div>

            {/* Log Table */}
            <div className="admin-card">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6366f1' }}>
                        Loading system activity stream...
                    </div>
                ) : isError ? (
                    <div className="admin-alert admin-alert-danger">
                        ⚠️ {error?.response?.data?.message || 'Failed to load activity log.'}
                    </div>
                ) : activityLogs.length === 0 ? (
                    <div className="admin-empty-state">
                        <span style={{ fontSize: '2.5rem' }}>📋</span>
                        <h3>No activity recorded</h3>
                        <p>No system events matched the selected filter.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '180px' }}>Timestamp</th>
                                    <th>Event Type</th>
                                    <th>Event Description</th>
                                    <th>User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLogs.map((log) => {
                                    const badge = getEventTypeBadge(log.type);
                                    return (
                                        <tr key={log.id}>
                                            <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '999px',
                                                        background: badge.bg,
                                                        color: badge.text,
                                                        border: `1px solid ${badge.border}`,
                                                        fontWeight: 600,
                                                        fontSize: '0.78rem',
                                                    }}
                                                >
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td style={{ color: '#f8fafc', fontWeight: 500 }}>
                                                {log.event}
                                            </td>
                                            <td>
                                                <div style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}>
                                                    {log.user_name || 'System'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {log.user_email || ''}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminActivityPage;
