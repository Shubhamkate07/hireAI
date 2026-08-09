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
const redis          = require('../config/redis');
const config         = require('../config/env.config');

const CACHE_TTL_SECONDS      = 300; // 5 minutes — analytics summary & hiring speed
const LEADERBOARD_TTL_SECONDS = 120; // 2 minutes — leaderboard changes with every new attempt

// ─── Recruiter Jobs Summary ──────────────────────────────────────────────────
const getRecruiterSummary = async (recruiterId) => {
    const cacheKey = `analytics:recruiter:${recruiterId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (config.isDev) {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getRecruiterSummary:', err.message);
    }

    if (config.isDev) {
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
            if (config.isDev) {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getRecruiterJobApplications:', err.message);
    }

    if (config.isDev) {
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
            if (config.isDev) {
                console.log(`⚡ Analytics Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getPlatformStats:', err.message);
    }

    if (config.isDev) {
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

// ─── Assessment Leaderboard ───────────────────────────────────────────────────
// WHY 2-MINUTE TTL (not 5 min or 60s)?
//   Leaderboard data changes every time a candidate submits an assessment.
//   5 minutes would be too stale — a newly submitted score could be #1
//   but not show up for 5 minutes.
//   60 seconds is unnecessarily expensive for a query that runs RANK() OVER.
//   2 minutes is a good balance: fresh enough to be useful, cached enough
//   to protect the DB from burst traffic if many recruiters view at once.
//   Cache is also explicitly DEL'd in assessment.service.submitAssessment()
//   so the very next fetch after a submission always gets fresh data.
const getAssessmentLeaderboard = async (assessmentId) => {
    const cacheKey = `analytics:leaderboard:${assessmentId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (config.isDev) {
                console.log(`⚡ Leaderboard Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getAssessmentLeaderboard:', err.message);
    }

    if (config.isDev) {
        console.log(`🔍 Leaderboard Cache MISS — querying DB: ${cacheKey}`);
    }

    const leaderboard = await analyticsModel.getAssessmentLeaderboard(assessmentId);

    try {
        await redis.set(cacheKey, JSON.stringify(leaderboard), 'EX', LEADERBOARD_TTL_SECONDS);
    } catch (err) {
        console.error('Redis write error in getAssessmentLeaderboard:', err.message);
    }

    return leaderboard;
};

// ─── Hiring Speed ───────────────────────────────────────────────────────────────────
// Hiring-speed data is slow-changing (DATEDIFF on historical decisions)
// so 5-minute TTL is appropriate here — same as the summary analytics.
const getHiringSpeed = async (recruiterId) => {
    const cacheKey = `analytics:hiring-speed:${recruiterId}`;

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            if (config.isDev) {
                console.log(`⚡ Hiring Speed Cache HIT: ${cacheKey}`);
            }
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis read error in getHiringSpeed:', err.message);
    }

    if (config.isDev) {
        console.log(`🔍 Hiring Speed Cache MISS — querying DB: ${cacheKey}`);
    }

    const hiringSpeed = await analyticsModel.getHiringSpeed(recruiterId);

    try {
        await redis.set(cacheKey, JSON.stringify(hiringSpeed), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
        console.error('Redis write error in getHiringSpeed:', err.message);
    }

    return hiringSpeed;
};

module.exports = {
    getRecruiterSummary,
    getRecruiterJobApplications,
    getPlatformStats,
    getAssessmentLeaderboard,
    getHiringSpeed,
};
