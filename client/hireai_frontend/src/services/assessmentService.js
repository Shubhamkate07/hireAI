/**
 * ============================================================
 * assessmentService.js  — Data Access Layer for Assessments (Frontend)
 * ============================================================
 *
 * All calls go through the shared `api` axios instance (services/api.js)
 * which handles:
 *   • baseURL from VITE_API_URL env var
 *   • withCredentials: true  (sends httpOnly cookie with every request)
 *   • 401 interception → automatic logout
 *
 * WHY we built against a mock first (Interview Q4 — answered):
 *   The component only cares about the DATA SHAPE, not the source.
 *   Mock → real swap required zero changes to AssessmentPage.jsx.
 *   Only this service file changed, proving the pattern works.
 * ============================================================
 */
import api from './api';


// ─────────────────────────────────────────────────────────────────────────────
// getAssessment(assessmentId)
//
// GET /api/assessments/:id
//
// Backend response shape (candidate view — correct_answer already stripped):
// {
//   success: true,
//   data: {
//     id: 1,
//     title: "Frontend Developer Quiz",
//     description: "...",
//     job_id: 1,
//     time_limit_minutes: 30,
//     created_by: 2,
//     questions: [
//       {
//         id: 1,
//         question_text: "Which hook runs side effects?",
//         question_type: "mcq",
//         options: ["useState", "useEffect", "useContext", "useReducer"],
//         points: 10
//         // no correct_answer — backend strips it for candidates
//       }
//     ]
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getAssessment = async (assessmentId) => {
    const response = await api.get(`/assessments/${assessmentId}`);
    return response.data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// getAssessmentByJobId(jobId)
//
// GET /api/assessments/by-job/:jobId
//
// Returns: { id, title, time_limit_minutes } or null if no assessment exists.
//
// Used by JobDetailPage to:
//   1. Know whether to show the "Take Assessment" button
//   2. Get the assessmentId to build the link: /assessments/:assessmentId
// ─────────────────────────────────────────────────────────────────────────────
export const getAssessmentByJobId = async (jobId) => {
    const response = await api.get(`/assessments/by-job/${jobId}`);
    return response.data.data;  // { id, title, time_limit_minutes } or null
};
//
// POST /api/assessments/:id/submit
//
// Request body sent to backend:
// {
//   "submittedAnswers": [
//     { "questionId": 1, "answer": "useEffect" },
//     { "questionId": 2, "answer": "When the effect re-runs" }
//   ]
// }
//
// NOTE: We do NOT send a score — server always computes it from correct_answer.
//
// Backend response shape:
// {
//   success: true,
//   data: { score: 20, totalPossible: 30 }
// }
// ─────────────────────────────────────────────────────────────────────────────
export const submitAssessment = async (assessmentId, submittedAnswers) => {
    const response = await api.post(`/assessments/${assessmentId}/submit`, {
        submittedAnswers,
    });
    return response.data.data;  // { score, totalPossible }
};
