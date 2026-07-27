/**
 * ============================================================
 * analytics.service.js — Business Logic & Caching for Analytics
 * ============================================================
 *
 * CACHE-ASIDE PATTERN:
 *   1. Check Redis cache first.
 *   2. On Cache Hit -> parse JSON and return immediately.
 *   3. On Cache Miss -> query MySQL aggregate model.
 *   4. Store result in Redis with 5-minute TTL (300 seconds).
 *
 * WHY 5-MINUTE TTL FOR ANALYTICS?
 *   Analytics data is aggregated across many rows and does not require
 *   millisecond-freshness. A 5-minute cache TTL reduces expensive DB
 *   aggregation queries while delivering quick dashboard load times.
 * ============================================================
 */

const analyticsModel = require('../models/analytics.model');
const redis = require('../config/redis');

const CACHE_TTL_SECONDS = 300; // 5 minutes TTL

// ─── Recruiter Jobs Summary ──────────────────────────────────────────────────
const getRecruiterSummary = async (recruiterId) => {
    const cacheKey = `analytics:recruiter:${recruiterId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getRecruiterSummary:', err.message);
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Analytics Cache MISS — querying DB: ${cacheKey}`);
    }

    const summary = await analyticsModel.getRecruiterJobsSummary(recruiterId);

    try {
        await redis.set(cacheKey, JSON.stringify(summary), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        console.error('Redis write error in getRecruiterSummary:', err.message);
    }

    return summary;
};

// ─── Recruiter Applications per Job ──────────────────────────────────────────
const getRecruiterJobApplications = async (recruiterId) => {
    const cacheKey = `analytics:recruiter:apps:${recruiterId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getRecruiterJobApplications:', err.message);
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Analytics Cache MISS — querying DB: ${cacheKey}`);
    }

    const applicationsBreakdown = await analyticsModel.getRecruiterApplicationsPerJob(recruiterId);

    try {
        await redis.set(cacheKey, JSON.stringify(applicationsBreakdown), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        console.error('Redis write error in getRecruiterJobApplications:', err.message);
    }

    return applicationsBreakdown;
};

// ─── Platform-wide Stats (Admin) ─────────────────────────────────────────────
const getPlatformStats = async () => {
    const cacheKey = `analytics:platform`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getPlatformStats:', err.message);
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Analytics Cache MISS — querying DB: ${cacheKey}`);
    }

    const stats = await analyticsModel.getPlatformStats();

    try {
        await redis.set(cacheKey, JSON.stringify(stats), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        console.error('Redis write error in getPlatformStats:', err.message);
    }

    return stats;
};

module.exports = {
    getRecruiterSummary,
    getRecruiterJobApplications,
    getPlatformStats,
};
