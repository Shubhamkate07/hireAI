import api from './api';

/**
 * ============================================================
 * adminService.js — Frontend API calls for Admin Panel
 * ============================================================
 */

// ── Users ───────────────────────────────────────────────────────────────────
export const getAdminUsers = async ({ pageParam = 1, search = '', role = '' }) => {
    const params = { page: pageParam, limit: 10 };
    if (search) params.search = search;
    if (role && role !== 'all') params.role = role;
    const response = await api.get('/users', { params });
    return response.data.data;
};

export const updateUserRole = async (userId, role) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data.data;
};

export const updateUserStatus = async (userId, is_active) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { is_active });
    return response.data.data;
};

export const bulkDeactivateUsers = async (userIds) => {
    const response = await api.post('/admin/users/deactivate', { userIds });
    return response.data.data;
};

// ── Jobs ────────────────────────────────────────────────────────────────────
export const getAdminJobs = async ({ pageParam = 1, limit = 10, search = '', status = '' }) => {
    const params = { page: pageParam, limit };
    if (search) params.search = search;
    if (status && status !== 'all') params.status = status;
    const response = await api.get('/jobs', { params });
    return response.data.data;
};

export const updateJobStatus = async (jobId, status) => {
    const response = await api.patch(`/admin/jobs/${jobId}/status`, { status });
    return response.data.data;
};

export const deleteJob = async (jobId) => {
    const response = await api.delete(`/admin/jobs/${jobId}`);
    return response.data.data;
};

// ── Assessments ────────────────────────────────────────────────────────────
export const getAdminAssessments = async () => {
    const response = await api.get('/admin/assessments');
    return response.data.data;
};

export const getAdminAssessmentFull = async (assessmentId) => {
    const response = await api.get(`/admin/assessments/${assessmentId}`);
    return response.data.data;
};

export const updateAdminAssessment = async (assessmentId, payload) => {
    const response = await api.patch(`/admin/assessments/${assessmentId}`, payload);
    return response.data.data;
};

export const deleteAdminAssessment = async (assessmentId) => {
    const response = await api.delete(`/admin/assessments/${assessmentId}`);
    return response.data.data;
};

// ── Questions ───────────────────────────────────────────────────────────────
export const addAdminQuestion = async (assessmentId, payload) => {
    const response = await api.post(`/admin/assessments/${assessmentId}/questions`, payload);
    return response.data.data;
};

export const updateAdminQuestion = async (questionId, payload) => {
    const response = await api.patch(`/admin/questions/${questionId}`, payload);
    return response.data.data;
};

export const deleteAdminQuestion = async (questionId) => {
    const response = await api.delete(`/admin/questions/${questionId}`);
    return response.data.data;
};

// ── Activity Log & Platform Stats ───────────────────────────────────────────
export const getActivityLog = async ({ page = 1, limit = 50, type = 'all' } = {}) => {
    const response = await api.get('/admin/activity', {
        params: { page, limit, type },
    });
    return response.data.data;
};

export const getPlatformStats = async () => {
    const response = await api.get('/analytics/platform');
    return response.data.data;
};
