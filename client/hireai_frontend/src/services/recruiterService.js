import api from './api';

/**
 * ============================================================
 * recruiterService.js — Frontend API calls for Recruiter Portal
 * ============================================================
 */

// Fetch recruiter's jobs with application counts
export const getRecruiterJobs = async () => {
    const response = await api.get('/recruiter/jobs');
    return response.data;
};

// Fetch applicants for a specific job
export const getJobApplicants = async (jobId) => {
    const response = await api.get(`/recruiter/jobs/${jobId}/applications`);
    return response.data;
};

// Update an applicant's status
export const updateApplicantStatus = async (applicationId, status, notes = '') => {
    const response = await api.patch(`/recruiter/applications/${applicationId}/status`, {
        status,
        notes,
    });
    return response.data;
};

// Fetch recruiter's assessments with attempt and question counts
export const getRecruiterAssessments = async () => {
    const response = await api.get('/recruiter/assessments');
    return response.data;
};
