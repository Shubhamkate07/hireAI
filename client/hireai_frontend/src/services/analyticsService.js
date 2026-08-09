import api from './api';

/**
 * ============================================================
 * analyticsService.js — Frontend API calls for Analytics
 * ============================================================
 *
 * Keeps data-fetching completely separate from the visual layer.
 * Chart components receive plain data as props — they know nothing
 * about how that data was fetched.
 * ============================================================
 */

/**
 * GET /api/analytics/recruiter
 * Returns: { total_jobs, open_jobs, closed_jobs, draft_jobs }
 */
export const getRecruiterSummary = async () => {
    const response = await api.get('/analytics/recruiter');
    return response.data;
};

/**
 * GET /api/analytics/recruiter/applications
 * Returns: [{ id, title, total_applications, shortlisted, hired }, ...]
 */
export const getRecruiterJobApplications = async () => {
    const response = await api.get('/analytics/recruiter/applications');
    return response.data;
};
