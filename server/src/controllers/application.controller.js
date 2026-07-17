const applicationService = require('../services/application.service');
const ApiResponse        = require('../utils/ApiResponse');

// ─── POST /api/jobs/:jobId/apply ──────────────────────────────────────────────
const applyToJob = async (req, res, next) => {

    try {

        // req.file is set by upload.single('resume') middleware.
        // If the candidate didn't attach a file, req.file is undefined
        // and resumePath will be null — the DB column allows NULL.
        const resumePath = req.file?.path ?? null;

        const result = await applicationService.applyToJob(
            req.params.jobId,   // which job
            req.user.id,        // who is applying
            req.user.role,      // must be 'candidate'
            resumePath          // path to saved file on disk (or null)
        );

        return res.status(201).json(
            new ApiResponse(201, result, 'Application submitted successfully')
        );

    } catch (err) {
        next(err);
    }

};

// ─── GET /api/jobs/:jobId/applications ───────────────────────────────────────
const getApplicationsForJob = async (req, res, next) => {

    try {

        const applications = await applicationService.getApplicationsForJob(
            req.params.jobId,
            req.user.id,
            req.user.role
        );

        return res.status(200).json(
            new ApiResponse(200, applications, 'Applications fetched successfully')
        );

    } catch (err) {
        next(err);
    }

};

// ─── GET /api/applications/my ─────────────────────────────────────────────────
const getMyApplications = async (req, res, next) => {

    try {

        const applications = await applicationService.getMyApplications(req.user.id);

        return res.status(200).json(
            new ApiResponse(200, applications, 'My applications fetched successfully')
        );

    } catch (err) {
        next(err);
    }

};

module.exports = {
    applyToJob,
    getApplicationsForJob,
    getMyApplications,
};
