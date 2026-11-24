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
const aiService       = require('./ai.service');
const ApiError        = require('../utils/ApiError');
const config          = require('../config/env.config');
const logger          = require('../utils/logger');


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

    // Use transaction-wrapped creation of header + questions
    const assessmentId = await assessmentModel.createAssessmentWithQuestions(
        title,
        description,
        job_id,
        time_limit_minutes,
        requesterId,
        questions
    );

    // Return the full created object so the controller can send it back
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

    // 2. Candidate view: ensure application exists, auto-start or resume attempt, and calculate remaining_seconds
    if (requestorRole === 'candidate') {
        if (assessment.job_id) {
            await assessmentModel.ensureCandidateApplication(assessment.job_id, requestorId);
        }

        const totalMinutes = (assessment.time_limit_minutes && Number(assessment.time_limit_minutes) > 0)
            ? Number(assessment.time_limit_minutes)
            : 30;
        const totalSeconds = totalMinutes * 60;

        let attempt = await assessmentModel.findAttemptByCandidate(assessmentId, requestorId);
        let remainingSeconds = totalSeconds;
        let alreadySubmitted = false;

        if (attempt) {
            if (attempt.submitted_at) {
                alreadySubmitted = true;
                remainingSeconds = 0;
            } else {
                const startedAtMs = new Date(attempt.started_at).getTime();
                const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
                remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
                if (remainingSeconds <= 0) {
                    alreadySubmitted = true;
                    remainingSeconds = 0;
                    await assessmentModel.updateAttemptWithScore(attempt.id, attempt.score || 0, attempt.submitted_answers || []);
                }
            }
        } else {
            // First time candidate opens the assessment: record server start time immediately
            attempt = await assessmentModel.startAttempt(assessmentId, requestorId);
            remainingSeconds = totalSeconds;
        }

        const maxScore = (assessment.questions || []).reduce((sum, q) => sum + (Number(q.points ?? 10)), 0);

        return {
            ...assessment,
            time_limit_minutes: totalMinutes,
            attempt_id: attempt?.id,
            started_at: attempt?.started_at,
            remaining_seconds: remainingSeconds,
            already_submitted: alreadySubmitted,
            previous_score: attempt?.score ?? null,
            max_score: maxScore,
            questions: (assessment.questions || []).map(q => {
                // Destructure out correct_answer — it never reaches the client
                const { correct_answer, ...safeQuestion } = q;
                return safeQuestion;
            })
        };
    }

    // 3. Recruiters and Admins
    // Non-creator recruiters can preview questions (correct_answer stripped) without being blocked
    if (requestorRole === 'recruiter' && assessment.created_by !== requestorId) {
        return {
            ...assessment,
            questions: (assessment.questions || []).map(q => {
                const { correct_answer, ...safeQuestion } = q;
                return safeQuestion;
            })
        };
    }

    // Creator recruiter and Admins get full data (correct_answer included)
    return assessment;
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assessments/:id/start
//
// Creates a "started" attempt row that records the server-side start time.
// The candidate can call this before submitting. On submit, the server
// checks (NOW() - started_at) against time_limit_minutes.
//
// Returns { attemptId, started_at, time_limit_minutes, remaining_seconds }
// so the frontend can display a countdown, with the server as source of truth.
// ─────────────────────────────────────────────────────────────────────────────
const startAssessment = async (assessmentId, candidateId) => {

    const assessment = await assessmentModel.findAssessmentById(assessmentId);
    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    // ── Ensure Candidate Application exists for this job ──
    if (assessment.job_id) {
        await assessmentModel.ensureCandidateApplication(assessment.job_id, candidateId);
    }

    const totalMinutes = (assessment.time_limit_minutes && Number(assessment.time_limit_minutes) > 0)
        ? Number(assessment.time_limit_minutes)
        : 30;
    const totalSeconds = totalMinutes * 60;

    // Check if already started or submitted
    const existing = await assessmentModel.findAttemptByCandidate(assessmentId, candidateId);

    if (existing && existing.submitted_at) {
        throw new ApiError(409, 'You have already submitted this assessment');
    }

    if (existing && !existing.submitted_at) {
        // Already started but not submitted — return existing attempt with accurate remaining_seconds
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(existing.started_at).getTime()) / 1000));
        const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
        return {
            attemptId:          existing.id,
            started_at:         existing.started_at,
            time_limit_minutes: totalMinutes,
            remaining_seconds:  remainingSeconds,
            already_started:    true,
        };
    }

    // Create the started attempt
    const attempt = await assessmentModel.startAttempt(assessmentId, candidateId);

    return {
        attemptId:          attempt.id,
        started_at:         attempt.started_at,
        time_limit_minutes: totalMinutes,
        remaining_seconds:  totalSeconds,
        already_started:    false,
    };
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

    // ── Check for an existing attempt ──────────────────────────────────────────
    const existing = await assessmentModel.findAttemptByCandidate(assessmentId, candidateId);

    // ── CASE 1: Already submitted (has submitted_at) ───────────────────────────
    if (existing && existing.submitted_at) {
        throw new ApiError(409, 'You have already submitted this assessment');
    }

    // ── CASE 2: Auto-start if missing (fallback resiliency) ───────────────────
    let attempt = existing;
    if (!attempt) {
        attempt = await assessmentModel.startAttempt(assessmentId, candidateId);
    }

    // ── CASE 3: Enforce server-side time limit ─────────────────────────────────
    const assessment = await assessmentModel.findAssessmentById(assessmentId);
    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    // ── Ensure Candidate Application exists for this job ──
    if (assessment.job_id) {
        await assessmentModel.ensureCandidateApplication(assessment.job_id, candidateId);
    }

    const timeLimitMinutes = (assessment.time_limit_minutes && Number(assessment.time_limit_minutes) > 0)
        ? Number(assessment.time_limit_minutes)
        : 30;

    // Server-side deadline: allow a 60s grace for network latency / auto-submit.
    const elapsedSec = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
    if (attempt.started_at && elapsedSec > timeLimitMinutes * 60 + 60) {
        throw new ApiError(403, 'Time limit exceeded for this assessment');
    }

    // ── Fetch questions WITH correct_answer (server-side only) ─────────────────
    const questions = await assessmentModel.findByAssessmentId(assessmentId);

    if (questions.length === 0) {
        throw new ApiError(404, 'Assessment not found or has no questions');
    }

    // ── Score calculation — with Gemini AI Semantic Evaluation for non-MCQ questions ──
    let score = 0;

    for (const question of questions) {
        const submitted = (submittedAnswers || []).find(a => a.questionId === question.id);
        const candidateAnswer = (submitted?.answer || '').trim();
        const correctAnswer = (question.correct_answer || '').trim();
        const maxPoints = Number(question.points ?? 10);

        // Guard: A question with no answer key configured must never give free points!
        if (!correctAnswer) {
            continue;
        }

        const isExactMatch = candidateAnswer && candidateAnswer.toLowerCase() === correctAnswer.toLowerCase();

        if (isExactMatch) {
            score += maxPoints;
        } else if (question.question_type !== 'mcq' && candidateAnswer) {
            // Text or coding question: semantic evaluation with Gemini AI
            try {
                const evalResult = await aiService.evaluateSubjectiveAnswer({
                    questionText: question.question_text,
                    expectedAnswer: correctAnswer,
                    candidateAnswer,
                    maxPoints,
                });
                score += (Number(evalResult?.awardedPoints) || 0);
            } catch (err) {
                logger.warn(`AI subjective evaluation fallback for question ${question.id}: ${err.message}`);
            }
        }
    }

    const totalPossible = questions.reduce((sum, q) => sum + (Number(q.points ?? 10)), 0);

    // ── Update the existing attempt row with score and submitted_at (finalizes attempt) ──
    await assessmentModel.updateAttemptWithScore(attempt.id, score, submittedAnswers);

    // ── Task 4: Invalidate the leaderboard Redis cache for this assessment ────
    try {
        const redis = require('../config/redis');
        await redis.del(`analytics:leaderboard:${assessmentId}`);
        logger.debug(`Leaderboard cache invalidated for assessment ${assessmentId}`);
    } catch (err) {
        logger.warn(`Redis leaderboard cache invalidation error: ${err.message}`);
    }

    // ── Task 1: Real-time SSE push to all active leaderboard watchers ─────────
    try {
        const userModel = require('../models/user.model');
        const candidate = await userModel.findUserById(candidateId);
        const sseService = require('./sse.service');
        sseService.sendToAssessmentWatchers(assessmentId, {
            type: 'leaderboard_updated',
            assessmentId: Number(assessmentId),
            newEntry: {
                candidateName: candidate?.name || 'Candidate',
                score,
                rank: null,
            },
        });
    } catch (err) {
        console.error('[SSE] Failed sending leaderboard update event:', err.message);
    }

    return { score, totalPossible };

};


// ─────────────────────────────────────────────────────────────────────────────
// getAssessmentByJobId(jobId, userId, userRole)
//
// Lightweight lookup for the job detail page.
// Returns { id, title, time_limit_minutes, candidate_status, remaining_seconds, candidate_score }
// or null when no assessment exists.
// ─────────────────────────────────────────────────────────────────────────────
const getAssessmentByJobId = async (jobId, userId = null, userRole = null) => {
    const assessment = await assessmentModel.findAssessmentByJobId(jobId);
    if (!assessment) return null;

    let candidateStatus = 'not_started';
    let remainingSeconds = null;
    let candidateScore = null;

    if (userId && userRole === 'candidate') {
        const attempt = await assessmentModel.findAttemptByCandidate(assessment.id, userId);
        if (attempt) {
            if (attempt.submitted_at) {
                candidateStatus = 'completed';
                candidateScore = attempt.score;
                remainingSeconds = 0;
            } else {
                const totalSeconds = (Number(assessment.time_limit_minutes) || 30) * 60;
                const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000));
                if (elapsedSeconds >= totalSeconds) {
                    candidateStatus = 'completed';
                    candidateScore = attempt.score || 0;
                    remainingSeconds = 0;
                    try {
                        await assessmentModel.updateAttemptWithScore(attempt.id, candidateScore, attempt.submitted_answers || []);
                    } catch (err) {
                        console.error('[Assessment] Error auto-finalizing expired attempt in by-job lookup:', err.message);
                    }
                } else {
                    candidateStatus = 'in_progress';
                    remainingSeconds = totalSeconds - elapsedSeconds;
                }
            }
        }
    }

    return {
        ...assessment,
        candidate_status: candidateStatus,
        remaining_seconds: remainingSeconds,
        candidate_score: candidateScore,
    };
};

const updateAssessment = async (assessmentId, data, requesterId) => {
    const existing = await assessmentModel.findAssessmentById(assessmentId);
    if (!existing) throw new ApiError(404, 'Assessment not found');
    if (existing.created_by !== requesterId) throw new ApiError(403, 'You do not own this assessment');

    const { title, description, job_id, time_limit_minutes, questions } = data;

    // Use transaction-safe update that only replaces questions when explicitly provided
    await assessmentModel.updateAssessmentWithQuestions(
        assessmentId,
        title,
        description,
        job_id,
        time_limit_minutes,
        requesterId,
        questions
    );

    return assessmentModel.findAssessmentWithQuestions(assessmentId);
};


module.exports = {
    createAssessment,
    updateAssessment,
    getAssessment,
    startAssessment,
    submitAssessment,
    getAssessmentByJobId,
};
