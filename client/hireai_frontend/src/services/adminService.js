import api from './api';

/**
 * ============================================================
 * adminService.js — Frontend API calls for Admin Panel
 * ============================================================
 *
 * SECURITY NOTE (Exercise 5 theory):
 *   Hiding the Admin nav link from non-admin users is purely a UX
 *   choice. SECURITY is enforced by:
 *     1. ProtectedRoute requiredRole="admin" on the frontend route
 *     2. rbacMiddleware(['admin']) on every backend endpoint here
 *   Both layers must exist. The hidden nav link alone is NOT security.
 * ============================================================
 */

/**
 * GET /api/users?page=N&limit=10
 * Used by useInfiniteQuery — pageParam is injected by React Query.
 * Returns: { users: [...], total, page, totalPages }
 */
export const getAdminUsers = async ({ pageParam = 1 }) => {
    const response = await api.get('/users', {
        params: { page: pageParam, limit: 10 },
    });
    // Backend wraps in ApiResponse: { statusCode, data: { users, total, page, totalPages }, message }
    return response.data.data;
};

/**
 * GET /api/jobs?page=N&limit=10 (all jobs, all statuses)
 * Admin views all jobs across all recruiters.
 * Returns: { jobs: [...], pagination: { page, limit, total, totalPages } }
 */
export const getAdminJobs = async ({ pageParam = 1 }) => {
    const response = await api.get('/jobs', {
        params: { page: pageParam, limit: 10 },
    });
    return response.data.data;
};

/**
 * PATCH /api/jobs/:id
 * Admin changes a job's status (open / closed / draft).
 */
export const updateJobStatus = async (jobId, status) => {
    const response = await api.patch(`/jobs/${jobId}`, { status });
    return response.data.data;
};

/**
 * GET /api/analytics/platform
 * Platform-wide stats (admin only on the backend).
 * Returns: { usersByRole, totalJobs, totalApplications, totalAssessmentAttempts }
 */
export const getPlatformStats = async () => {
    const response = await api.get('/analytics/platform');
    return response.data.data;
};
