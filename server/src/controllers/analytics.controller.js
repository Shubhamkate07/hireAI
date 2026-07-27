/**
 * ============================================================
 * analytics.controller.js — HTTP Controller for Analytics
 * ============================================================
 */

const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/analytics/recruiter ─────────────────────────────────────────────
// Returns recruiter summary stats (total, open, closed, draft jobs)
const getRecruiterSummary = async (req, res, next) => {
    try {
        const summary = await analyticsService.getRecruiterSummary(req.user.id);
        return res.status(200).json(
            new ApiResponse(200, summary, 'Recruiter summary analytics fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/analytics/recruiter/applications ───────────────────────────────
// Returns per-job applications breakdown (total apps, shortlisted, hired)
const getRecruiterJobApplications = async (req, res, next) => {
    try {
        const breakdown = await analyticsService.getRecruiterJobApplications(req.user.id);
        return res.status(200).json(
            new ApiResponse(200, breakdown, 'Per-job application analytics fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/analytics/platform ──────────────────────────────────────────────
// Returns platform-wide stats (users by role, total jobs, applications, assessments)
const getPlatformStats = async (req, res, next) => {
    try {
        const stats = await analyticsService.getPlatformStats();
        return res.status(200).json(
            new ApiResponse(200, stats, 'Platform analytics fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getRecruiterSummary,
    getRecruiterJobApplications,
    getPlatformStats,
};
