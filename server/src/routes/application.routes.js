const express = require('express');

const applicationController =
    require('../controllers/application.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const rbacMiddleware =
    require('../middleware/rbac.middleware');

const router = express.Router();

// ─── POST /api/jobs/:jobId/apply ──────────────────────────────────────────────
// Protected — candidate only
router.post(
    '/:jobId/apply',
    authMiddleware,
    rbacMiddleware(['candidate']),
    applicationController.applyToJob
);

// ─── GET /api/jobs/:jobId/applications ───────────────────────────────────────
// Protected — recruiter or admin only
// Service layer additionally checks the recruiter OWNS this specific job.
router.get(
    '/:jobId/applications',
    authMiddleware,
    rbacMiddleware(['recruiter', 'admin']),
    applicationController.getApplicationsForJob
);

module.exports = router;
