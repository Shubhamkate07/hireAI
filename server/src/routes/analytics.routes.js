/**
 * ============================================================
 * analytics.routes.js — Analytics Routes
 * ============================================================
 *
 * Base path: /api/analytics (registered in app.js)
 *
 * Endpoints:
 *   GET /api/analytics/recruiter             (Protected: recruiter/admin)
 *   GET /api/analytics/recruiter/applications(Protected: recruiter/admin)
 *   GET /api/analytics/platform             (Protected: admin only)
 * ============================================================
 */

const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

const router = express.Router();

// All analytics routes require authentication
router.use(authMiddleware);

// GET /api/analytics/recruiter — Recruiter's jobs summary
router.get(
    '/recruiter',
    rbacMiddleware(['recruiter', 'admin']),
    analyticsController.getRecruiterSummary
);

// GET /api/analytics/recruiter/applications — Per-job breakdown
router.get(
    '/recruiter/applications',
    rbacMiddleware(['recruiter', 'admin']),
    analyticsController.getRecruiterJobApplications
);

// GET /api/analytics/platform — Platform-wide stats (Admin only)
router.get(
    '/platform',
    rbacMiddleware(['admin']),
    analyticsController.getPlatformStats
);

module.exports = router;
