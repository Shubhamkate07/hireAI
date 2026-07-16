const express = require('express');

const applicationController =
    require('../controllers/application.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const rbacMiddleware =
    require('../middleware/rbac.middleware');

const router = express.Router();

// ─── GET /api/applications/my ─────────────────────────────────────────────────
// Candidate views all their own applications across every job.
router.get(
    '/my',
    authMiddleware,
    rbacMiddleware(['candidate']),
    applicationController.getMyApplications
);

module.exports = router;
