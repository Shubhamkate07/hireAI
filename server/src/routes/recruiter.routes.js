/**
 * ============================================================
 * recruiter.routes.js — Recruiter Portal API Routes
 * ============================================================
 *
 * Base path: /api/recruiter  (registered in app.js)
 *
 * All routes require:
 *   - authMiddleware      → must be logged in
 *   - rbacMiddleware      → must be 'recruiter' or 'admin'
 *
 * Routes:
 *   GET   /api/recruiter/jobs                              → jobs + application count
 *   GET   /api/recruiter/jobs/:jobId/applications          → applicants for one job
 *   PATCH /api/recruiter/applications/:applicationId/status → move candidate through pipeline
 *
 * ⚠️  ROUTE ORDER MATTERS:
 *   '/jobs' must come before '/jobs/:jobId/applications'
 *   so Express doesn't try to match 'jobs' as a :jobId param.
 *   (Express matches top-to-bottom and stops at the first match.)
 * ============================================================
 */

const express             = require('express');
const recruiterController = require('../controllers/recruiter.controller');
const authMiddleware      = require('../middleware/auth.middleware');
const rbacMiddleware      = require('../middleware/rbac.middleware');

const router = express.Router();

// All recruiter routes are protected — must be logged in AND be a recruiter/admin
router.use(authMiddleware); 
router.use(rbacMiddleware(['recruiter', 'admin']));

// ─── GET /api/recruiter/jobs ──────────────────────────────────────────────────
// List of the recruiter's own jobs with how many applications each has received.
router.get('/jobs', recruiterController.getMyJobs);

// ─── GET /api/recruiter/jobs/:jobId/applications ──────────────────────────────
// All applicants for one specific job (ownership enforced in the service).
router.get('/jobs/:jobId/applications', recruiterController.getApplicants);

// ─── PATCH /api/recruiter/applications/:applicationId/status ─────────────────
// Move a candidate to a new status. Body: { status, notes? }
// State machine in recruiter.service enforces valid transitions only.
router.patch('/applications/:applicationId/status', recruiterController.updateStatus);

module.exports = router;
