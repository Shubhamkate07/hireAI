/**
 * ============================================================
 * recruiter.controller.js — HTTP layer for the Recruiter Portal
 * ============================================================
 *
 * Controller's only job:
 *   1. Read from req  (params, body, user)
 *   2. Call the service
 *   3. Send back JSON using ApiResponse
 *
 * Zero business logic here — all of that lives in recruiter.service.js
 * ============================================================
 */

const recruiterService = require('../services/recruiter.service');
const ApiResponse      = require('../utils/ApiResponse');

// ─── GET /api/recruiter/jobs ──────────────────────────────────────────────────
// Returns the logged-in recruiter's jobs with application_count on each.
const getMyJobs = async (req, res, next) => {
    try {
        const jobs = await recruiterService.getRecruiterJobs(req.user.id);

        return res.status(200).json(
            new ApiResponse(200, jobs, 'Recruiter jobs fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/recruiter/jobs/:jobId/applications ──────────────────────────────
// Returns all applicants for one of the recruiter's jobs (with candidate details).
const getApplicants = async (req, res, next) => {
    try {
        const applications = await recruiterService.getApplicantsForJob(
            req.params.jobId,
            req.user.id
        );

        return res.status(200).json(
            new ApiResponse(200, applications, 'Applicants fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/recruiter/applications/:applicationId/status ─────────────────
// Moves a candidate through the hiring pipeline.
// Body: { status: 'under_review', notes: 'Good candidate, calling next week' }
const updateStatus = async (req, res, next) => {
    try {
        const { status, notes } = req.body;

        // Basic input validation — status is required
        if (!status) {
            return res.status(400).json(
                new ApiResponse(400, null, 'status is required in the request body')
            );
        }

        const result = await recruiterService.updateApplicationStatus(
            req.params.applicationId,  // which application to update
            req.user.id,               // recruiter must own the job
            status,                    // the new status to transition to
            notes                      // optional recruiter notes
        );

        return res.status(200).json(
            new ApiResponse(200, result, `Application moved to '${result.status}'`)
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyJobs,
    getApplicants,
    updateStatus,
};
