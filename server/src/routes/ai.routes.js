/**
 * ============================================================
 * ai.routes.js  — AI API Endpoints
 * ============================================================
 * Base path: /api/ai
 */

const express        = require('express');
const aiController   = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

const router = express.Router();

// ─── POST /api/ai/generate-assessment ─────────────────────────────────────────
// Generates structured questions for assessments using Gemini
router.post(
    '/generate-assessment',
    authMiddleware,
    rbacMiddleware(['recruiter', 'admin']),
    aiController.generateAssessmentQuestions
);

// ─── POST /api/ai/generate-job-description ───────────────────────────────────
// Generates professional job description using Gemini
router.post(
    '/generate-job-description',
    authMiddleware,
    rbacMiddleware(['recruiter', 'admin']),
    aiController.generateJobDescription
);

// ─── POST /api/ai/screen-resume/:applicationId ───────────────────────────────
// Evaluates candidate resume and match score against job requirements using Gemini
router.post(
    '/screen-resume/:applicationId',
    authMiddleware,
    rbacMiddleware(['recruiter', 'admin']),
    aiController.screenResume
);

// ─── GET /api/ai/assessment-feedback/:assessmentId ───────────────────────────
// Generates personalized strengths, improvement areas, and study plan using Gemini
router.get(
    '/assessment-feedback/:assessmentId',
    authMiddleware,
    rbacMiddleware(['candidate', 'recruiter', 'admin']),
    aiController.generateCandidateFeedback
);

module.exports = router;
