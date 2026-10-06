import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAdminAssessments, deleteAdminAssessment } from '../../services/adminService';
import './AdminDashboard.css';

const AdminAssessmentsPage = () => {
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [deleteModalAssessment, setDeleteModalAssessment] = useState(null);

    const { data: assessments = [], isLoading, isError, error } = useQuery({
        queryKey: ['admin', 'assessments'],
        queryFn: getAdminAssessments,
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteAdminAssessment(id),
        onSuccess: (_, id) => {
            setActionSuccess(`Assessment #${id} deleted successfully.`);
            setActionError('');
            setDeleteModalAssessment(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'assessments'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to delete assessment.');
            setActionSuccess('');
        },
    });

    const filteredAssessments = assessments.filter((a) => {
        const matchesTitle = a.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCreator = (a.creator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (a.creator_email || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTitle || matchesCreator;
    });

    return (
        <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <Link to="/admin" className="admin-back-link">← Back to Admin Overview</Link>
                </div>
                <h1 className="admin-page-title">📝 Technical Assessments Management</h1>
                <p className="admin-page-subtitle">Inspect, edit, or remove technical quizzes across all recruiters.</p>
            </div>

            {actionSuccess && (
                <div className="admin-alert admin-alert-success">
                    ✅ {actionSuccess}
                </div>
            )}

            {actionError && (
                <div className="admin-alert admin-alert-danger">
                    ⚠️ {actionError}
                </div>
            )}

            {/* Filter Bar */}
            <div className="admin-filter-bar">
                <div className="admin-search-input-wrap">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search assessment title or creator..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-input"
                    />
                </div>

                <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    Showing {filteredAssessments.length} of {assessments.length} total assessments
                </div>
            </div>

            {/* Content Table */}
            <div className="admin-card">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6366f1' }}>
                        Loading assessments...
                    </div>
                ) : isError ? (
                    <div className="admin-alert admin-alert-danger">
                        ⚠️ {error?.response?.data?.message || 'Failed to load assessments list.'}
                    </div>
                ) : filteredAssessments.length === 0 ? (
                    <div className="admin-empty-state">
                        <span style={{ fontSize: '2.5rem' }}>📝</span>
                        <h3>No assessments found</h3>
                        <p>No assessment records matched your search term.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Created By</th>
                                    <th>Job Linked</th>
                                    <th>Questions</th>
                                    <th>Attempts</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssessments.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{item.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                ⏱️ {item.time_limit_minutes || 30} mins
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                                                {item.creator_name || 'Recruiter'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {item.creator_email || `ID #${item.created_by}`}
                                            </div>
                                        </td>
                                        <td>
                                            {item.job_title ? (
                                                <span className="job-link-badge">
                                                    📌 {item.job_title}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                                    Standalone (No Job)
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#818cf8' }}>
                                            {item.question_count || 0} Qs
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#34d399' }}>
                                            {item.attempt_count || 0}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                <Link
                                                    to={`/admin/assessments/${item.id}`}
                                                    className="btn-action btn-view"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteModalAssessment(item)}
                                                    className="btn-action btn-delete"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteModalAssessment && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <h3 style={{ margin: '0 0 12px', color: '#ef4444' }}>⚠️ Confirm Assessment Deletion</h3>
                        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5 }}>
                            Are you sure you want to delete assessment <strong>"{deleteModalAssessment.title}"</strong> (ID #{deleteModalAssessment.id})?
                        </p>
                        <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '8px' }}>
                            This will delete all associated questions and candidate attempt scores.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                            <button
                                onClick={() => setDeleteModalAssessment(null)}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteModalAssessment.id)}
                                disabled={deleteMutation.isPending}
                                className="btn-confirm-delete"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Assessment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAssessmentsPage;
