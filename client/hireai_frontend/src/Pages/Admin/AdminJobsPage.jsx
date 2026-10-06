import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAdminJobs, updateJobStatus, deleteJob } from '../../services/adminService';
import './AdminDashboard.css';

const AdminJobsPage = () => {
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    // Modal state for hard delete confirmation
    const [deleteModalJob, setDeleteModalJob] = useState(null);

    // Fetch jobs with infinite query
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
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

    // Mutation for status update
    const statusMutation = useMutation({
        mutationFn: ({ jobId, status }) => updateJobStatus(jobId, status),
        onSuccess: (_, variables) => {
            setActionSuccess(`Job #${variables.jobId} status updated to '${variables.status}'`);
            setActionError('');
            queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to update job status.');
            setActionSuccess('');
        },
    });

    // Mutation for hard delete
    const deleteMutation = useMutation({
        mutationFn: (jobId) => deleteJob(jobId),
        onSuccess: (_, jobId) => {
            setActionSuccess(`Job #${jobId} deleted successfully.`);
            setActionError('');
            setDeleteModalJob(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to delete job.');
            setActionSuccess('');
        },
    });

    // Filter jobs locally
    const filteredJobs = allJobs.filter((job) => {
        const matchesSearch =
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <Link to="/admin" className="admin-back-link">← Back to Admin Overview</Link>
                </div>
                <h1 className="admin-page-title">💼 Job Postings Management</h1>
                <p className="admin-page-subtitle">View, update status, or hard delete job postings across all recruiters.</p>
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
                        placeholder="Search by job title or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-input"
                    />
                </div>

                <div className="admin-filter-group">
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="admin-select"
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    Showing {filteredJobs.length} of {totalJobs} total jobs
                </div>
            </div>

            {/* Content Table */}
            <div className="admin-card">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6366f1' }}>
                        Loading jobs list...
                    </div>
                ) : isError ? (
                    <div className="admin-alert admin-alert-danger">
                        ⚠️ {error?.response?.data?.message || 'Failed to load jobs list.'}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="admin-empty-state">
                        <span style={{ fontSize: '2.5rem' }}>💼</span>
                        <h3>No jobs found</h3>
                        <p>No job records matched your filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title & Location</th>
                                        <th>Company</th>
                                        <th>Type</th>
                                        <th>Apps</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredJobs.map((job) => (
                                        <tr key={job.id}>
                                            <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{job.id}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{job.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                    📍 {job.location || 'Remote'}
                                                </div>
                                            </td>
                                            <td style={{ color: '#cbd5e1', fontWeight: 500 }}>{job.company}</td>
                                            <td>
                                                <span className="type-badge">{job.job_type || 'full-time'}</span>
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#a5b4fc' }}>
                                                {job.application_count ?? job.applications_count ?? 0}
                                            </td>
                                            <td>
                                                <select
                                                    value={job.status}
                                                    onChange={(e) =>
                                                        statusMutation.mutate({ jobId: job.id, status: e.target.value })
                                                    }
                                                    className={`status-select ${job.status}`}
                                                    disabled={statusMutation.isPending}
                                                >
                                                    <option value="open">open</option>
                                                    <option value="closed">closed</option>
                                                    <option value="draft">draft</option>
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                                    <Link
                                                        to={`/jobs/${job.id}`}
                                                        className="btn-action btn-view"
                                                    >
                                                        View
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModalJob(job)}
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

                        {hasNextPage && (
                            <div className="load-more-wrap">
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="btn-load-more"
                                >
                                    {isFetchingNextPage ? 'Loading more...' : 'Load More Jobs'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalJob && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <h3 style={{ margin: '0 0 12px', color: '#ef4444' }}>⚠️ Confirm Hard Delete</h3>
                        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5 }}>
                            Are you sure you want to delete job <strong>"{deleteModalJob.title}"</strong> (ID #{deleteModalJob.id})?
                        </p>
                        <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '8px' }}>
                            This operation is permanent and will cascade-delete all candidate applications for this job.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                            <button
                                onClick={() => setDeleteModalJob(null)}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteModalJob.id)}
                                disabled={deleteMutation.isPending}
                                className="btn-confirm-delete"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Job'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminJobsPage;
