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

module.exports = {
    createJob,
    listJobs,
    getJobById,
};
