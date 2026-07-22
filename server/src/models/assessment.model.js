/**
 * ============================================================
 * assessment.model.js  — Raw SQL for the Assessment Engine
 * ============================================================
 *
 * Three tables it touches:
 *   assessments         — one assessment per job posting
 *   questions           — MCQ/text/coding questions linked to an assessment
 *   assessment_attempts — one row per candidate submission
 *
 * Pattern: every function is async, returns plain JS data.
 * No HTTP logic here — that lives in controllers.
 * No business rules here — that lives in services.
 * ============================================================
 */

const pool = require('../config/database');


// ════════════════════════════════════════════════════════════════════════════
// ASSESSMENTS
// ════════════════════════════════════════════════════════════════════════════

// ─── createAssessment ─────────────────────────────────────────────────────────
// Inserts a new assessment row.
// `createdBy` = req.user.id of the recruiter/admin who created it.
// `jobId`     = which job posting this assessment belongs to (nullable).
// Returns the new assessment's auto-increment id.
const createAssessment = async (title, description, jobId, timeLimitMinutes, createdBy) => {

    const [result] = await pool.query(
        `INSERT INTO assessments (title, description, job_id, time_limit_minutes, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [title, description, jobId ?? null, timeLimitMinutes ?? 30, createdBy]
    );

    return result.insertId;
};


// ─── findAssessmentById ───────────────────────────────────────────────────────
// Fetches ONE assessment row (no questions — those are joined separately).
// Used by the service to check ownership and existence.
const findAssessmentById = async (id) => {

    const [rows] = await pool.query(
        `SELECT * FROM assessments WHERE id = ?`,
        [id]
    );

    return rows[0]; // undefined if not found
};


// ─── findAssessmentByJobId ────────────────────────────────────────────────────
// Lightweight lookup used by the job detail page to determine whether to show
// the "Take Assessment" button. Returns only the fields the frontend needs.
// Returns undefined when no assessment is linked to this job.
const findAssessmentByJobId = async (jobId) => {

    const [rows] = await pool.query(
        `SELECT id, title, time_limit_minutes
         FROM assessments
         WHERE job_id = ?
         LIMIT 1`,
        [jobId]
    );

    return rows[0]; // undefined if no assessment for this job
};


// ─── findAssessmentWithQuestions ──────────────────────────────────────────────
// Fetches an assessment + ALL its questions in one JOIN.
// NOTE: correct_answer IS included here — the service layer decides
//       whether to strip it before sending to the client.
const findAssessmentWithQuestions = async (id) => {

    const [rows] = await pool.query(
        `SELECT
            a.id                  AS assessment_id,
            a.title               AS assessment_title,
            a.description         AS assessment_description,
            a.job_id,
            a.time_limit_minutes,
            a.created_by,
            q.id                  AS question_id,
            q.question_text,
            q.question_type,
            q.options,
            q.correct_answer,
            q.points
         FROM assessments a
         LEFT JOIN questions q ON q.assessment_id = a.id
         WHERE a.id = ?
         ORDER BY q.id ASC`,
        [id]
    );

    if (rows.length === 0) return null;

    // The assessment header columns repeat on every row.
    // Pull them from row[0], then build the questions array.
    const assessment = {
        id:                 rows[0].assessment_id,
        title:              rows[0].assessment_title,
        description:        rows[0].assessment_description,
        job_id:             rows[0].job_id,
        time_limit_minutes: rows[0].time_limit_minutes,
        created_by:         rows[0].created_by,
        questions: rows
            // A LEFT JOIN returns one row with null question fields if no questions exist.
            .filter(row => row.question_id !== null)
            .map(row => ({
                id:             row.question_id,
                question_text:  row.question_text,
                question_type:  row.question_type,
                // options is stored as JSON string in DB; mysql2 may auto-parse it.
                // Wrap in try/catch to handle both cases safely.
                options:        parseJsonSafely(row.options),
                correct_answer: row.correct_answer,  // stripped by service for candidates
                points:         row.points,
            }))
    };

    return assessment;
};


// ════════════════════════════════════════════════════════════════════════════
// QUESTIONS
// ════════════════════════════════════════════════════════════════════════════

// ─── createQuestion ───────────────────────────────────────────────────────────
// Inserts one question row.
// `options` must be a JS array/object — stored as JSON in the DB.
// `correctAnswer` is a string: the correct option value.
const createQuestion = async (assessmentId, questionText, questionType, options, correctAnswer, points) => {

    const [result] = await pool.query(
        `INSERT INTO questions
            (assessment_id, question_text, question_type, options, correct_answer, points)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            assessmentId,
            questionText,
            questionType ?? 'mcq',
            JSON.stringify(options ?? []),
            correctAnswer,
            points ?? 10,
        ]
    );

    return result.insertId;
};


// ─── findByAssessmentId ───────────────────────────────────────────────────────
// Returns ALL questions for one assessment.
// Used by the scoring service — includes correct_answer (server-side only).
const findByAssessmentId = async (assessmentId) => {

    const [rows] = await pool.query(
        `SELECT * FROM questions WHERE assessment_id = ? ORDER BY id ASC`,
        [assessmentId]
    );

    return rows.map(row => ({
        ...row,
        options: parseJsonSafely(row.options),
    }));
};


// ════════════════════════════════════════════════════════════════════════════
// ASSESSMENT ATTEMPTS
// ════════════════════════════════════════════════════════════════════════════

// ─── createAttempt ────────────────────────────────────────────────────────────
// Inserts one attempt row after scoring.
// `submittedAnswers` is the raw array the candidate sent — stored as JSON.
// `score` is already calculated server-side before this is called.
const createAttempt = async (assessmentId, candidateId, score, submittedAnswers) => {

    const [result] = await pool.query(
        `INSERT INTO assessment_attempts
            (assessment_id, candidate_id, score, submitted_answers, submitted_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [assessmentId, candidateId, score, JSON.stringify(submittedAnswers)]
    );

    return result.insertId;
};


// ─── findAttemptByCandidate ───────────────────────────────────────────────────
// INTERVIEW Q4 ANSWER (double-submission prevention):
// Before inserting a new attempt, the service calls this to check if one
// already exists. If it does, we throw 409 Conflict.
// This check + the UNIQUE KEY on (assessment_id, candidate_id) together
// form a two-layer guard:
//   Layer 1 (service): fast check, returns clear error message
//   Layer 2 (DB):      last-resort protection against race conditions
const findAttemptByCandidate = async (assessmentId, candidateId) => {

    const [rows] = await pool.query(
        `SELECT id, score, submitted_at
         FROM assessment_attempts
         WHERE assessment_id = ? AND candidate_id = ?`,
        [assessmentId, candidateId]
    );

    return rows[0]; // undefined = not yet attempted
};


// ════════════════════════════════════════════════════════════════════════════
// Internal helper
// ════════════════════════════════════════════════════════════════════════════

// mysql2 sometimes returns JSON columns as strings, sometimes as objects.
// This normalises both cases.
function parseJsonSafely(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value; // already parsed
    try {
        return JSON.parse(value);
    } catch {
        return value; // return as-is if not valid JSON
    }
}


module.exports = {
    // assessments
    createAssessment,
    findAssessmentById,
    findAssessmentByJobId,
    findAssessmentWithQuestions,
    // questions
    createQuestion,
    findByAssessmentId,
    // attempts
    createAttempt,
    findAttemptByCandidate,
};
