/**
 * ============================================================
 * assessment.routes.js  — Assessment API Routes
 * ============================================================
 *
 * Base path: /api/assessments  (registered in app.js)
 *
 * Routes:
 *   POST /api/assessments                  — create assessment + questions
 *   GET  /api/assessments/by-job/:jobId    — lookup assessment ID for a job ← MUST be before /:id
 *   GET  /api/assessments/:id              — fetch assessment (role-aware)
 *   POST /api/assessments/:id/submit       — candidate submits answers
 *
 * ⚠️  ROUTE ORDER MATTERS in Express.
 *     /by-job/:jobId MUST be registered BEFORE /:id.
 *     If /:id comes first, Express matches /by-job/1 as { id: "by-job" }
 *     and calls the wrong handler entirely.
 * ============================================================
 */

const express              = require('express');
const assessmentController = require('../controllers/assessment.controller');
const authMiddleware       = require('../middleware/auth.middleware');
const rbacMiddleware       = require('../middleware/rbac.middleware');

const router = express.Router();


// ─── POST /api/assessments ────────────────────────────────────────────────────
// Only recruiters and admins can create assessments.
router.post(
    '/',
    authMiddleware,
    rbacMiddleware(['recruiter', 'admin']),
    assessmentController.createAssessment
);


// ─── GET /api/assessments/by-job/:jobId ──────────────────────────────────────
// MUST be defined BEFORE /:id to avoid Express matching "by-job" as the :id param.
// Returns { id, title, time_limit_minutes } or null for the given job.
// Used by JobDetailPage to conditionally show the "Take Assessment" button.
router.get(
    '/by-job/:jobId',
    authMiddleware,
    assessmentController.getAssessmentByJobId
);


// ─── GET /api/assessments/:id ─────────────────────────────────────────────────
// Fetch assessment + questions. Role-aware field stripping in the service layer:
//   - candidate  → correct_answer stripped from every question
//   - recruiter (creator) / admin → full data including correct_answer
router.get(
    '/:id',
    authMiddleware,
    assessmentController.getAssessment
);


// ─── POST /api/assessments/:id/submit ────────────────────────────────────────
// Only candidates can submit answers.
router.post(
    '/:id/submit',
    authMiddleware,
    rbacMiddleware(['candidate']),
    assessmentController.submitAssessment
);


module.exports = router;
