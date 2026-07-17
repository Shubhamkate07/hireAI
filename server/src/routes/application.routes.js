const express = require('express');

const applicationController =
    require('../controllers/application.controller');

const authMiddleware =
    require('../middleware/auth.middleware');

const rbacMiddleware =
    require('../middleware/rbac.middleware');

// ─── Multer upload middleware ─────────────────────────────────────────────────
// upload.single('resume') tells multer to look for ONE file in the multipart
// form field named "resume" — matching the FormData key set in the frontend:
//   formData.append('resume', resumeFile)
// After this middleware runs:
//   • req.file  — the uploaded file object (path, originalname, size, mimetype)
//   • req.body  — any other non-file form fields
// If no file is sent, req.file will be undefined (resume_path will be null).
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// ─── POST /api/jobs/:jobId/apply ──────────────────────────────────────────────
// Middleware chain (runs left to right):
//   1. authMiddleware       — verify JWT, attach req.user
//   2. rbacMiddleware       — confirm role === 'candidate'
//   3. upload.single('resume') — parse the multipart body, save file to disk
//   4. applicationController.applyToJob — business logic
router.post(
    '/:jobId/apply',
    authMiddleware,
    rbacMiddleware(['candidate']),
    upload.single('resume'),
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
