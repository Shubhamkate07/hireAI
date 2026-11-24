/**
 * ============================================================
 * job.service.js — Business logic for job operations
 * ============================================================
 *
 * CACHE-ASIDE PATTERN (applied to findJobs):
 *
 *   1. CHECK CACHE FIRST — build a unique key from the request params,
 *      ask Redis if we have a stored result for this exact request.
 *
 *   2. CACHE HIT → return the stored data immediately.
 *      No database query. This is why caching is fast.
 *
 *   3. CACHE MISS → query MySQL as normal, then STORE the result
 *      in Redis with a TTL (time-to-live). Future requests
 *      for the same params get served from cache.
 *
 *   4. ON WRITES (create/update/delete) → INVALIDATE the cache.
 *      We delete all keys matching 'jobs:list:*' so the next
 *      GET /api/jobs fetches fresh data from the database.
 *
 * WHY GET /api/jobs SPECIFICALLY?
 *   - Read-heavy: fetched on every page load, filter change, pagination
 *   - Write-rare: jobs are created/updated much less often than listed
 *   - Data does not need millisecond freshness — 60s stale is fine
 * ============================================================
 */

const jobModel = require('../models/job.model');
const ApiError = require('../utils/ApiError');
const redis    = require('../config/redis');
const config   = require('../config/env.config');
const logger   = require('../utils/logger');

// ─── Cache key prefix ────────────────────────────────────────────────────────
// All job list cache entries start with 'jobs:list:'.
// This lets us delete all of them in one pattern match during invalidation.
const CACHE_PREFIX = 'jobs:list:';
const CACHE_TTL    = 60; // seconds — how long a cache entry lives

// ─── Helper: delete all job list cache entries ────────────────────────────────
/**
 * invalidateJobsCache
 * ───────────────────
 * Finds every Redis key that starts with 'jobs:list:' and deletes them all.
 *
 * WHY KEYS IS USED HERE (and the production caveat):
 *   redis.keys('jobs:list:*') scans the entire Redis keyspace in one blocking
 *   call. At this learning scale (dozens of keys) this is perfectly fine.
 *
 *   ⚠️  PRODUCTION WARNING: On a large Redis instance with millions of keys,
 *   KEYS blocks the Redis event loop while scanning — no other command can
 *   execute until it finishes. The production-safe alternative is SCAN, which
 *   iterates in small batches and yields between them, keeping Redis responsive.
 *   Use KEYS in dev/learning, SCAN in production.
 */
const invalidateJobsCache = async () => {
    try {
        const keys = await redis.keys(`${CACHE_PREFIX}*`);
        if (keys && keys.length > 0) {
            await redis.del(...keys);
            logger.info(`🗑️ Cache invalidated: deleted ${keys.length} key(s)`);
        }
    } catch (err) {
        logger.warn(`Redis error in invalidateJobsCache: ${err.message}`);
    }
};

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

    // ── INVALIDATE CACHE ─────────────────────────────────────────────────────
    // A new job was created → any cached job list is now stale.
    // Delete all cached lists so the next GET fetches fresh data.
    await invalidateJobsCache();

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

    // Security fix: Draft jobs must NEVER be publicly visible on the platform.
    // If no status is specified, default to 'open'. If 'draft' is queried, clamp to 'open'.
    const effectiveStatus = (status && status !== 'draft') ? status : 'open';
    const filters = { status: effectiveStatus, job_type, location, search };

    // ── STEP 1: Build a unique cache key for this exact request ──────────────
    // Every unique combination of filters/page/limit gets its own cache entry.
    // Example: 'jobs:list:{"filters":{"status":"open"},"pageNum":1,"limitNum":10}'
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify({ filters, pageNum, limitNum })}`;

    // ── STEP 2: Check the cache first (graceful fallback if Redis is down) ─
    let cached = null;
    try {
        cached = await redis.get(cacheKey);
    } catch (err) {
        logger.warn(`Redis get error: ${err.message}`);
    }

    if (cached) {
        // CACHE HIT — return immediately, no DB query needed
        logger.debug(`⚡ Cache HIT for key: ${cacheKey}`);
        try {
            return JSON.parse(cached);
        } catch (e) {
            // Ignore parse failure and fall through
        }
    }

    // ── STEP 3: Cache miss — query the database ───────────────────────────────
    logger.debug(`🔍 Cache MISS — querying database for key: ${cacheKey}`);
    const [jobs, total] = await Promise.all([
        jobModel.findAllJobs(offset, limitNum, filters),
        jobModel.getJobCount(effectiveStatus, job_type, location, search),
    ]);

    const result = {
        jobs,
        pagination: {
            page:       pageNum,
            limit:      limitNum,
            total:      Number(total),
            totalPages: Math.ceil(Number(total) / limitNum),
        },
    };

    // ── STEP 4: Store result in Redis with a 60-second TTL ───────────────────
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
        logger.debug(`💾 Cache SET for key: ${cacheKey} (TTL: ${CACHE_TTL}s)`);
    } catch (err) {
        logger.warn(`Redis set error: ${err.message}`);
    }

    return result;
};

// ─── Find Single Job ─────────────────────────────────────────────────────────
const findJobById = async (id) => {

    const job = await jobModel.findJobById(id);

    if (!job) {
        throw new ApiError(404, 'Job not found');
    }

    return job;
};

// ─── Update Job (only owner or admin) ────────────────────────────────────────
const updateJob = async (jobId, userId, userRole, updates) => {

    const job = await jobModel.findJobById(jobId);

    if (!job) throw new ApiError(404, 'Job not found');

    if (job.posted_by !== userId && userRole !== 'admin') {
        throw new ApiError(403, 'You are not authorized to update this job');
    }

    const title       = updates.title       || job.title;
    const description = updates.description || job.description;
    const company     = updates.company     || job.company;
    const location    = updates.location    || job.location;
    const salaryMin   = updates.salary_min  ?? job.salary_min;
    const salaryMax   = updates.salary_max  ?? job.salary_max;
    const jobType     = updates.job_type    || job.job_type;
    const status      = updates.status      || job.status;

    const updatedJob = await jobModel.updateJob(
        jobId,
        title, description, company, location,
        salaryMin, salaryMax, jobType, status
    );

    // ── INVALIDATE CACHE ─────────────────────────────────────────────────────
    // A job was updated → cached lists that include this job now show old data.
    await invalidateJobsCache();

    return updatedJob;
};

// ─── Delete Job — soft close (only owner or admin) ────────────────────────────
const deleteJob = async (jobId, userId, userRole) => {

    const job = await jobModel.findJobById(jobId);

    if (!job) throw new ApiError(404, 'Job not found');

    if (job.posted_by !== userId && userRole !== 'admin') {
        throw new ApiError(403, 'You are not authorized to delete this job');
    }

    await jobModel.deleteJob(jobId);

    // ── INVALIDATE CACHE ─────────────────────────────────────────────────────
    // A job was deleted → cached lists still show it. Invalidate immediately.
    await invalidateJobsCache();

    return { id: jobId, status: 'closed' };
};

// ─── Get My Jobs (recruiter's own listing) ───────────────────────────────────
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
