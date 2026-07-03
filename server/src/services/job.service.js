const jobModel = require("../models/job.model");

// ─── Create Job ───────────────────────────────────────────────────────────────

const createJob = async (
    title,
    description,
    company,
    location,
    salaryMin,
    salaryMax,
    jobType,
    postedBy
) => {

    const jobId = await jobModel.createJob(
        title,
        description,
        company,
        location,
        salaryMin ?? null,
        salaryMax ?? null,
        jobType,
        postedBy
    );

    const job = await jobModel.findJobById(jobId);

    return job;

};

// ─── Find Jobs (with pagination + filters) ───────────────────────────────────

const findJobs = async (
    page,
    limit,
    status,
    job_type,
    location,
    search
) => {

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset   = (pageNum - 1) * limitNum;

    const filters = { status, job_type, location, search };

    const [jobs, total] = await Promise.all([
        jobModel.findAllJobs(offset, limitNum, filters),
        jobModel.getJobCount(status, job_type, location, search),
    ]);

    return {
        jobs,
        pagination: {
            page:       pageNum,
            limit:      limitNum,
            total:      Number(total),
            totalPages: Math.ceil(Number(total) / limitNum),
        },
    };

};

// ─── Find Single Job ─────────────────────────────────────────────────────────

const findJobById = async (id) => {

    const job = await jobModel.findJobById(id);

    if (!job) {
        throw new ApiError(404, "Job not found");
    }

    return job;

};

module.exports = {
    createJob,
    findJobs,
    findJobById,
};
