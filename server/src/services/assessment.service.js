/**
 * ============================================================
 * assessment.service.js  — Business Logic for the Assessment Engine
 * ============================================================
 *
 * INTERVIEW QUESTION ANSWERS (as comments throughout this file):
 *
 * Q1: "Why must scoring always be recalculated server-side?"
 *     → The client controls the HTTP request body. If scoring happened client-side
 *       and the candidate just sent { score: 100 }, we'd accept it blindly.
 *       Server-side recalculation means the score is always derived from the
 *       stored `correct_answer` values in the DB — a value the client never sees
 *       and cannot modify. No matter what the client sends, the server computes
 *       the real score from its own trusted data.
 *
 * Q2: "How do you decide what fields to strip based on role?"
 *     → Check req.user.role in the service. The model always returns full data
 *       (including correct_answer). The service then decides:
 *         - candidate → map questions, deleting correct_answer from each
 *         - recruiter/admin who created it → return full data including correct_answer
 *       This "strip at the service layer" pattern keeps the model simple
 *       (one query, full data) and all role logic in one place.
 *
 * Q3: "Why store submitted_answers as JSON instead of a row per answer?"
 *     → JSON column: one INSERT, simple to read back, no JOIN needed.
 *       Separate rows: one INSERT per question, more flexible querying per-answer.
 *       TRADEOFF: JSON is simpler and faster for the write path and for
 *       displaying "what did this candidate submit?" But you cannot easily
 *       query "how many candidates answered question 5 correctly" without
 *       parsing every JSON blob in application code. Separate rows allow
 *       that aggregation in SQL. For this feature, JSON is the right choice
 *       because we only ever read the whole submission at once, never per-question.
 *
 * Q4: "How do you prevent double-scoring on concurrent submissions?"
 *     → Two-layer defence:
 *       Layer 1 (service, this file): findAttemptByCandidate before inserting.
 *                                    Returns 409 immediately if one exists.
 *       Layer 2 (database):           UNIQUE KEY (assessment_id, candidate_id)
 *                                    on assessment_attempts. Even if two concurrent
 *                                    requests both pass Layer 1 before either inserts,
 *                                    the DB will reject the second INSERT with a
 *                                    duplicate key error (caught → 409).
 *
 * Q5: "How does job_id change how you query assessments for a job?"
 *     → Without job_id you'd need to JOIN through some other table.
 *       With job_id directly on assessments:
 *         SELECT * FROM assessments WHERE job_id = ?
 *       Simple, indexed, one table. The frontend can also link directly:
 *         /jobs/:jobId/assessment  → fetches WHERE job_id = jobId
 * ============================================================
 */

const assessmentModel = require('../models/assessment.model');
const ApiError = require('../utils/ApiError');


// ─────────────────────────────────────────────────────────────────────────────
// createAssessment(data, questions, requesterId)
//
// Creates the assessment header + bulk-inserts all questions.
// Only recruiters and admins can do this (enforced in routes via rbac).
//
// `data.questions` is an array of question objects:
//   [{
//     question_text: "...",
//     question_type: "mcq",
//     options: ["Option A", "Option B", ...],
//     correct_answer: "Option A",
//     points: 10
//   }]
// ─────────────────────────────────────────────────────────────────────────────
const createAssessment = async (data, requesterId) => {

    const { title, description, job_id, time_limit_minutes, questions = [] } = data;

    // 1. Insert the assessment header
    const assessmentId = await assessmentModel.createAssessment(
        title,
        description,
        job_id,
        time_limit_minutes,
        requesterId   // created_by = the logged-in recruiter/admin
    );

    // 2. Insert each question one by one
    //    (A bulk INSERT would be faster in production but this is clear to read)
    for (const q of questions) {
        await assessmentModel.createQuestion(
            assessmentId,
            q.question_text,
            q.question_type,
            q.options,
            q.correct_answer,
            q.points
        );
    }

    // 3. Return the full created object so the controller can send it back
    return assessmentModel.findAssessmentWithQuestions(assessmentId);
};


// ─────────────────────────────────────────────────────────────────────────────
// getAssessment(assessmentId, requestorRole, requestorId)
//
// INTERVIEW Q2 in action — role-aware field stripping.
//
// The model always returns full data including correct_answer.
// This service function decides what to expose:
//   - candidate  → strip correct_answer from every question
//   - recruiter who created it OR admin → full data
//   - recruiter who did NOT create it   → 403 Forbidden
// ─────────────────────────────────────────────────────────────────────────────
const getAssessment = async (assessmentId, requestorRole, requestorId) => {

    // 1. Fetch full data from DB (correct_answer included)
    const assessment = await assessmentModel.findAssessmentWithQuestions(assessmentId);

    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    // 2. Recruiter ownership check
    //    Admins can see any assessment.
    //    Recruiters can only see assessments they created.
    if (requestorRole === 'recruiter' && assessment.created_by !== requestorId) {
        throw new ApiError(403, 'You do not have permission to view this assessment');
    }

    // 3. Strip correct_answer for candidates
    //    INTERVIEW Q2: We check the role here and transform the data before returning.
    if (requestorRole === 'candidate') {
        return {
            ...assessment,
            questions: assessment.questions.map(q => {
                // Destructure out correct_answer — it never reaches the client
                const { correct_answer, ...safeQuestion } = q;
                return safeQuestion;
            })
        };
    }

    // 4. Recruiters/admins get the full data (correct_answer included)
    return assessment;
};


// ─────────────────────────────────────────────────────────────────────────────
// submitAssessment(assessmentId, candidateId, submittedAnswers)
//
// INTERVIEW Q1 in action — server-side scoring.
//
// submittedAnswers format (array):
//   [ { questionId: 1, answer: "Option A" }, { questionId: 2, answer: "Option C" } ]
//
// The client NEVER sends a score. We fetch correct_answer from DB and
// compute the score ourselves. Even if the client tampers with the payload,
// they can only affect which answer is recorded, not the score itself.
// ─────────────────────────────────────────────────────────────────────────────
const submitAssessment = async (assessmentId, candidateId, submittedAnswers) => {

    // ── INTERVIEW Q4: Double-submission guard (Layer 1) ────────────────────────
    const existing = await assessmentModel.findAttemptByCandidate(assessmentId, candidateId);
    if (existing) {
        throw new ApiError(409, 'You have already submitted this assessment');
    }

    // ── Fetch questions WITH correct_answer (server-side only) ─────────────────
    const questions = await assessmentModel.findByAssessmentId(assessmentId);

    if (questions.length === 0) {
        throw new ApiError(404, 'Assessment not found or has no questions');
    }

    // ── Score calculation — INTERVIEW Q1 ──────────────────────────────────────
    // We iterate the DB questions (trusted source of truth).
    // For each question, we look up what the candidate submitted for that questionId.
    // We never touch the score field from the request body.
    let score = 0;

    for (const question of questions) {
        const submitted = submittedAnswers.find(a => a.questionId === question.id);
        if (submitted && submitted.answer === question.correct_answer) {
            score += question.points;
        }
    }

    const totalPossible = questions.reduce((sum, q) => sum + q.points, 0);

    // ── INTERVIEW Q4: Double-submission guard (Layer 2 — DB UNIQUE KEY handles races) ──
    // If two concurrent requests both passed the guard above before either inserted,
    // the DB UNIQUE KEY on (assessment_id, candidate_id) rejects the second INSERT.
    await assessmentModel.createAttempt(assessmentId, candidateId, score, submittedAnswers);

    // ── Task 4: Invalidate the leaderboard Redis cache for this assessment ────
    // WHY: RANK() OVER (...) is now stale — this new score may change rankings.
    // DEL forces a Cache MISS on the next leaderboard fetch, so RANK() re-runs
    // against fresh data. This pairs with the 2-minute TTL: even without explicit
    // invalidation the cache would expire, but DEL guarantees immediate freshness
    // right after submission — the moment it matters most.
    try {
        const redis = require('../config/redis');
        await redis.del(`analytics:leaderboard:${assessmentId}`);
        if (process.env.NODE_ENV === 'development') {
            console.log(`🗑️  Leaderboard cache invalidated for assessment ${assessmentId}`);
        }
    } catch (err) {
        // Non-fatal: if Redis is down, the TTL will expire naturally.
        console.error('Redis leaderboard cache invalidation error:', err.message);
    }

    return { score, totalPossible };

};


// ─────────────────────────────────────────────────────────────────────────────
// getAssessmentByJobId(jobId)
//
// Lightweight lookup for the job detail page.
// Returns { id, title, time_limit_minutes } or null when no assessment exists.
// The frontend uses null as a signal to hide the "Take Assessment" button.
// ─────────────────────────────────────────────────────────────────────────────
const getAssessmentByJobId = async (jobId) => {
    const assessment = await assessmentModel.findAssessmentByJobId(jobId);
    return assessment ?? null; // normalise undefined → null for consistent JSON
};


module.exports = {
    createAssessment,
    getAssessment,
    submitAssessment,
    getAssessmentByJobId,
};
