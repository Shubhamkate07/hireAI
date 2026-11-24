const applicationModel = require('../models/application.model');
const jobModel         = require('../models/job.model');
const ApiError         = require('../utils/ApiError');
const redis            = require('../config/redis');

// ─── Apply to a job ───────────────────────────────────────────────────────────
const applyToJob = async (jobId, userId, userRole, resumePath) => {

    // Rule 1: only candidates can apply
    if (userRole !== 'candidate') {
        throw new ApiError(403, 'Only candidates can apply to jobs');
    }

    // Rule 2: job must exist and be open
    const job = await jobModel.findJobById(jobId);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    if (job.status !== 'open') {
        throw new ApiError(400, 'This job is not accepting applications');
    }

    // Rule 3: no duplicate application
    // We let the DB UNIQUE constraint be the final guard.
    // MySQL throws error code 'ER_DUP_ENTRY' (errno 1062) on a duplicate insert.
    // We catch that here and convert it to a clean 409 instead of a raw 500.
    try {

        const applicationId = await applicationModel.createApplication(
            jobId,
            userId,
            resumePath   // null if no file was uploaded
        );

        // Invalidate analytics caches
        try {
            await Promise.all([
                redis.del(`analytics:recruiter:${job.posted_by}`),
                redis.del(`analytics:recruiter:apps:${job.posted_by}`),
                redis.del('analytics:platform'),
            ]);
        } catch (e) {}

        return { application_id: applicationId, job_id: jobId, status: 'applied' };

    } catch (err) {

        // ER_DUP_ENTRY is MySQL's duplicate key error code
        if (err.code === 'ER_DUP_ENTRY') {
            throw new ApiError(409, 'You have already applied to this job');
        }

        // Anything else — re-throw so the global error handler catches it
        throw err;

    }

};

// ─── Get applicants for a job (recruiter / admin only) ───────────────────────
// Same ownership pattern from job.service: only the job's owner or an admin
// is allowed to see who applied.
const getApplicationsForJob = async (jobId, userId, userRole) => {

    // Step 1: job must exist
    const job = await jobModel.findJobById(jobId);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    // Step 2: ownership check — only the posting recruiter or an admin
    if (job.posted_by !== userId && userRole !== 'admin') {
        throw new ApiError(403, 'You are not authorized to view applicants for this job');
    }

    // Step 3: run the JOIN query
    const applications = await applicationModel.findApplicationsByJob(jobId);

    return applications;

};

// ─── Get a candidate's own applications ──────────────────────────────────────
const getMyApplications = async (userId) => {

    const applications = await applicationModel.findApplicationsByCandidate(userId);

    return applications;

};

// ─── Get resume file path for authorized download ─────────────────────────────
const getResumeFile = async (applicationId, userId, userRole) => {
    const app = await applicationModel.findById(applicationId);
    if (!app) {
        throw new ApiError(404, 'Application not found');
    }
    if (!app.resume_path) {
        throw new ApiError(404, 'No resume attached to this application');
    }

    // Role-based authorization:
    // • Candidate can only view their own resume
    // • Recruiter can view resumes for jobs they posted
    // • Admin can view any resume
    if (userRole === 'candidate') {
        if (Number(app.candidate_id) !== Number(userId)) {
            throw new ApiError(403, 'Unauthorized access to resume');
        }
    } else if (userRole === 'recruiter') {
        const job = await jobModel.findJobById(app.job_id);
        if (!job || Number(job.posted_by) !== Number(userId)) {
            throw new ApiError(403, 'Unauthorized access to resume');
        }
    } else if (userRole !== 'admin') {
        throw new ApiError(403, 'Unauthorized access to resume');
    }

    return app.resume_path;
};

module.exports = {
    applyToJob,
    getApplicationsForJob,
    getMyApplications,
    getResumeFile,
};
