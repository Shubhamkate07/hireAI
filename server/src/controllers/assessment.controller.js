/**
 * ============================================================
 * assessment.controller.js  — HTTP Layer for Assessments
 * ============================================================
 *
 * Controller's only responsibilities:
 *   1. Read from req  (params, body, user)
 *   2. Call the service
 *   3. Send back a JSON response using ApiResponse
 *
 * All business logic → assessment.service.js
 * All SQL            → assessment.model.js
 * ============================================================
 */

const assessmentService = require('../services/assessment.service');
const ApiResponse       = require('../utils/ApiResponse');


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments
//
// Creates an assessment with its questions in one request.
// Protected: recruiter or admin only (enforced in routes).
//
// Expected body:
// {
//   "title": "Frontend Quiz",
//   "description": "Basic React knowledge",
//   "job_id": 1,
//   "time_limit_minutes": 30,
//   "questions": [
//     {
//       "question_text": "What does useEffect do?",
//       "question_type": "mcq",
//       "options": ["Fetches data", "Runs side effects", "Manages state", "Renders JSX"],
//       "correct_answer": "Runs side effects",
//       "points": 10
//     }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
const createAssessment = async (req, res, next) => {
    try {

        const assessment = await assessmentService.createAssessment(
            req.body,
            req.user.id   // created_by = logged-in recruiter/admin
        );

        return res.status(201).json(
            new ApiResponse(201, assessment, 'Assessment created successfully')
        );

    } catch (err) {
        next(err);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/:id
//
// Returns the assessment + questions.
// correct_answer is STRIPPED for candidates, INCLUDED for recruiters/admins.
// ─────────────────────────────────────────────────────────────────────────────
const getAssessment = async (req, res, next) => {
    try {

        const assessment = await assessmentService.getAssessment(
            req.params.id,
            req.user.role,  // 'candidate' | 'recruiter' | 'admin'
            req.user.id
        );

        return res.status(200).json(
            new ApiResponse(200, assessment, 'Assessment fetched successfully')
        );

    } catch (err) {
        next(err);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments/:id/submit
//
// Candidate submits their answers.
// Score is ALWAYS computed server-side — never trusted from the request body.
//
// Expected body:
// {
//   "submittedAnswers": [
//     { "questionId": 1, "answer": "Runs side effects" },
//     { "questionId": 2, "answer": "useState" }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
const submitAssessment = async (req, res, next) => {
    try {

        const { submittedAnswers } = req.body;

        // Basic validation — submittedAnswers must be an array
        if (!Array.isArray(submittedAnswers)) {
            return res.status(400).json(
                new ApiResponse(400, null, 'submittedAnswers must be an array')
            );
        }

        const result = await assessmentService.submitAssessment(
            req.params.id,
            req.user.id,       // candidateId from JWT — cannot be spoofed
            submittedAnswers   // array of { questionId, answer }
        );

        return res.status(201).json(
            new ApiResponse(201, result, `Assessment submitted. Score: ${result.score} / ${result.totalPossible}`)
        );

    } catch (err) {
        next(err);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assessments/by-job/:jobId
//
// Lightweight lookup — returns just enough for the JobDetailPage button:
//   { id, title, time_limit_minutes }  or  null if no assessment exists.
//
// Frontend uses this to:
//   1. Decide whether to show the "Take Assessment" button
//   2. Get the assessmentId to build the navigation link /assessments/:id
// ─────────────────────────────────────────────────────────────────────────────
const getAssessmentByJobId = async (req, res, next) => {
    try {
        const assessment = await assessmentService.getAssessmentByJobId(req.params.jobId);

        // Return null data (not 404) when no assessment exists for this job.
        // The frontend treats null as "no assessment" and hides the button.
        return res.status(200).json(
            new ApiResponse(200, assessment, assessment
                ? 'Assessment found'
                : 'No assessment for this job')
        );

    } catch (err) {
        next(err);
    }
};


module.exports = {
    createAssessment,
    getAssessment,
    submitAssessment,
    getAssessmentByJobId,
};
