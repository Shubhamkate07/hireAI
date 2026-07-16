const jobModel  = require("../models/job.model");
const ApiError  = require("../utils/ApiError");

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

// ─── Update Job (only owner or admin) ────────────────────────────────────────
const updateJob = async (jobId, userId, userRole, updates) => {

    // Step 1 — find the job first
    const job = await jobModel.findJobById(jobId);

    if (!job) throw new ApiError(404, 'Job not found');

    // Step 2 — ownership check (explained below)
    if (job.posted_by !== userId && userRole !== 'admin') {
        throw new ApiError(403, 'You are not authorized to update this job');
    }

    // Step 3 — if a field is not sent, fall back to the existing DB value
    //           so we never accidentally wipe a field
    const title       = updates.title       || job.title;
    const description = updates.description || job.description;
    const company     = updates.company     || job.company;
    const location    = updates.location    || job.location;
    const salaryMin   = updates.salary_min  ?? job.salary_min;
    const salaryMax   = updates.salary_max  ?? job.salary_max;
    const jobType     = updates.job_type    || job.job_type;
    const status      = updates.status      || job.status;

    // Step 4 — call model with plain individual values
    const updatedJob = await jobModel.updateJob(
        jobId,
        title, description, company, location,
        salaryMin, salaryMax, jobType, status
    );

    return updatedJob;

};

// ─── Delete Job — soft close (only owner or admin) ───────────────────────────────
// We never DELETE a row — we set status='closed' instead. This preserves the
// job for reporting, audit trails, and any active applications that reference it.
const deleteJob = async (jobId, userId, userRole) => {

    const job = await jobModel.findJobById(jobId);

    if (!job) throw new ApiError(404, 'Job not found');

    if (job.posted_by !== userId && userRole !== 'admin') {
        throw new ApiError(403, 'You are not authorized to delete this job');
    }

    await jobModel.deleteJob(jobId); // sets status = 'closed'

    return { id: jobId, status: 'closed' };

};

// ─── Get My Jobs (recruiter’s own listing) ──────────────────────────────────────
// Returns ALL jobs posted by this recruiter regardless of status (active,
// draft, closed). This is the recruiter’s private dashboard view.
const getMyJobs = async (userId) => {

    const jobs = await jobModel.findJobsByUserId(userId);

    return jobs;

};

module.exports = {
    createJob,
    findJobs,
    findJobById,
    updateJob,
    deleteJob,
    getMyJobs,
};
