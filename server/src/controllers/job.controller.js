const jobService = require("../services/job.service");
const ApiResponse = require("../utils/ApiResponse");

// ─── POST /api/jobs ───────────────────────────────────────────────────────────

const createJob = async (req, res, next) => {

    try {

        const {
            title,
            description,
            company,
            location,
            salary_min,
            salary_max,
            job_type,
        } = req.body;

        const job = await jobService.createJob(
            title,
            description,
            company,
            location,
            salary_min,
            salary_max,
            job_type,
            req.user.id
        );

        return res.status(201).json(
            new ApiResponse(
                201,
                job,
                "Job created successfully"
            )
        );

    } catch (err) {
        next(err);
    }

};

// ─── GET /api/jobs ────────────────────────────────────────────────────────────

const listJobs = async (req, res, next) => {

    try {

        const {
            page,
            limit,
            status,
            job_type,
            location,
            search,
        } = req.query;

        const result = await jobService.findJobs(
            page,
            limit,
            status,
            job_type,
            location,
            search
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                result,
                "Jobs fetched successfully"
            )
        );

    } catch (err) {
        next(err);
    }

};

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────

const getJobById = async (req, res, next) => {

    try {

        const job = await jobService.findJobById(req.params.id);

        return res.status(200).json(
            new ApiResponse(
                200,
                job,
                "Job fetched successfully"
            )
        );

    } catch (err) {
        next(err);
    }

};

// ─── PATCH /api/jobs/:id ─────────────────────────────────────────────────────────

const updateJob = async (req, res, next) => {

    try {

        // req.body will only contain fields the client actually sent
        const updates = req.body;

        const job = await jobService.updateJob(
            req.params.id,   // which job
            req.user.id,     // who is making the request
            req.user.role,   // their role (for admin bypass)
            updates          // partial update payload
        );

        return res.status(200).json(
            new ApiResponse(200, job, "Job updated successfully")
        );

    } catch (err) {
        next(err);
    }

};

// ─── DELETE /api/jobs/:id ──────────────────────────────────────────────────────

const deleteJob = async (req, res, next) => {

    try {

        const result = await jobService.deleteJob(
            req.params.id,
            req.user.id,
            req.user.role
        );

        return res.status(200).json(
            new ApiResponse(200, result, "Job closed successfully")
        );

    } catch (err) {
        next(err);
    }

};

// ─── GET /api/jobs/my-jobs ────────────────────────────────────────────────────

const getMyJobs = async (req, res, next) => {

    try {

        const jobs = await jobService.getMyJobs(req.user.id);

        return res.status(200).json(
            new ApiResponse(200, jobs, "My jobs fetched successfully")
        );

    } catch (err) {
        next(err);
    }

};

module.exports = {
    createJob,
    listJobs,
    getJobById,
    updateJob,
    deleteJob,
    getMyJobs,
};
