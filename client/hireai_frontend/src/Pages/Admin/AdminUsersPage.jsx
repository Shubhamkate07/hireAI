import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getAdminUsers, updateUserRole, updateUserStatus, bulkDeactivateUsers } from '../../services/adminService';
import './AdminDashboard.css';

const AdminUsersPage = () => {
    const queryClient = useQueryClient();
    const currentUser = useSelector((state) => state.auth.user);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Fetch users with infinite query
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['admin', 'users'],
        queryFn: getAdminUsers,
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    });

    const allUsers = data?.pages.flatMap((page) => page.users) ?? [];
    const totalUsers = data?.pages[0]?.total ?? 0;

    // Mutation for role update
    const roleMutation = useMutation({
        mutationFn: ({ userId, role }) => updateUserRole(userId, role),
        onSuccess: (_, variables) => {
            setActionSuccess(`User #${variables.userId} role updated to ${variables.role}`);
            setActionError('');
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to update user role.');
            setActionSuccess('');
        },
    });

    // Mutation for status update (activate/deactivate)
    const statusMutation = useMutation({
        mutationFn: ({ userId, is_active }) => updateUserStatus(userId, is_active),
        onSuccess: (_, variables) => {
            const statusText = variables.is_active ? 'activated' : 'deactivated';
            setActionSuccess(`User #${variables.userId} has been ${statusText}`);
            setActionError('');
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to update user status.');
            setActionSuccess('');
        },
    });

    // Mutation for bulk deactivation
    const bulkDeactivateMutation = useMutation({
        mutationFn: (userIds) => bulkDeactivateUsers(userIds),
        onSuccess: (data) => {
            setActionSuccess(`Successfully deactivated ${data.deactivatedCount} non-admin users.`);
            setActionError('');
            setSelectedUserIds([]);
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setTimeout(() => setActionSuccess(''), 3000);
        },
        onError: (err) => {
            setActionError(err?.response?.data?.message || err?.message || 'Bulk deactivation failed.');
            setActionSuccess('');
        },
    });

    // Filter users locally for search term and role dropdown
    const filteredUsers = allUsers.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const eligibleIds = filteredUsers
                .filter((u) => Number(u.id) !== Number(currentUser?.id) && u.role !== 'admin')
                .map((u) => u.id);
            setSelectedUserIds(eligibleIds);
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleToggleSelectUser = (userId) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    return (
        <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <Link to="/admin" className="admin-back-link">← Back to Admin Overview</Link>
                </div>
                <h1 className="admin-page-title">👥 User Management</h1>
                <p className="admin-page-subtitle">View, manage roles, and control account statuses across all registered users.</p>
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
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-input"
                    />
                </div>

                <div className="admin-filter-group">
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Role:</label>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="admin-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="candidate">Candidate</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                {selectedUserIds.length > 0 && (
                    <button
                        onClick={() => bulkDeactivateMutation.mutate(selectedUserIds)}
                        disabled={bulkDeactivateMutation.isPending}
                        className="btn-action btn-deactivate"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                        {bulkDeactivateMutation.isPending
                            ? 'Deactivating...'
                            : `🔴 Deactivate Selected (${selectedUserIds.length})`}
                    </button>
                )}

                <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    Showing {filteredUsers.length} of {totalUsers} total users
                </div>
            </div>

            {/* Content Table */}
            <div className="admin-card">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6366f1' }}>
                        Loading users list...
                    </div>
                ) : isError ? (
                    <div className="admin-alert admin-alert-danger">
                        ⚠️ {error?.response?.data?.message || 'Failed to load users list.'}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="admin-empty-state">
                        <span style={{ fontSize: '2.5rem' }}>👤</span>
                        <h3>No users found</h3>
                        <p>No user records matched your filter criteria.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={
                                                    selectedUserIds.length > 0 &&
                                                    selectedUserIds.length ===
                                                        filteredUsers.filter(
                                                            (u) => Number(u.id) !== Number(currentUser?.id) && u.role !== 'admin'
                                                        ).length
                                                }
                                            />
                                        </th>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined Date</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u) => {
                                        const isSelf = Number(u.id) === Number(currentUser?.id);
                                        const isActive = u.is_active === 1 || u.is_active === true;
                                        const isChecked = selectedUserIds.includes(u.id);
                                        const isSelectable = !isSelf && u.role !== 'admin';

                                        return (
                                            <tr key={u.id}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={!isSelectable}
                                                        onChange={() => handleToggleSelectUser(u.id)}
                                                    />
                                                </td>
                                                <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{u.id}</td>
                                                <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                                                    {u.name} {isSelf && <span className="self-badge">(You)</span>}
                                                </td>
                                                <td style={{ color: '#cbd5e1' }}>{u.email}</td>
                                                <td>
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) =>
                                                            roleMutation.mutate({ userId: u.id, role: e.target.value })
                                                        }
                                                        className={`role-select ${u.role}`}
                                                        disabled={roleMutation.isPending}
                                                    >
                                                        <option value="candidate">candidate</option>
                                                        <option value="recruiter">recruiter</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                                                        {isActive ? '● Active' : '○ Inactive'}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() =>
                                                            statusMutation.mutate({
                                                                userId: u.id,
                                                                is_active: !isActive,
                                                            })
                                                        }
                                                        disabled={isSelf || statusMutation.isPending}
                                                        className={`btn-action ${isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                                        title={isSelf ? 'You cannot deactivate your own account' : ''}
                                                    >
                                                        {isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                    {isFetchingNextPage ? 'Loading more...' : 'Load More Users'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminUsersPage;
