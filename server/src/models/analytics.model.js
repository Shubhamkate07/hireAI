const pool = require('../config/database');

/**
 * ============================================================
 * analytics.model.js — Aggregate SQL Queries for Analytics
 * ============================================================
 *
 * All analytics queries use SQL aggregate functions:
 *   - COUNT(*), COUNT(id)
 *   - SUM(CASE WHEN ... THEN 1 ELSE 0 END)
 *   - GROUP BY ...
 * ============================================================
 */

// ─── Recruiter Jobs Summary ────────────────────────────────────────────────────
// Aggregates job counts by status for a specific recruiter.
const getRecruiterJobsSummary = async (recruiterId) => {
    const [rows] = await pool.query(
        `SELECT
            COUNT(*) AS total_jobs,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_jobs,
            SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_jobs,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_jobs
         FROM jobs
         WHERE posted_by = ?`,
        [recruiterId]
    );

    const summary = rows[0] || {};
    return {
        total_jobs: Number(summary.total_jobs || 0),
        open_jobs: Number(summary.open_jobs || 0),
        closed_jobs: Number(summary.closed_jobs || 0),
        draft_jobs: Number(summary.draft_jobs || 0),
    };
};

// ─── Applications per Job Breakdown ───────────────────────────────────────────
// Returns total applications, shortlisted count, and hired count per job.
// LEFT JOIN ensures jobs with 0 applications are still included in the result.
const getRecruiterApplicationsPerJob = async (recruiterId) => {
    const [rows] = await pool.query(
        `SELECT
            j.id,
            j.title,
            COUNT(a.id) AS total_applications,
            SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
            SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) AS hired
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         WHERE j.posted_by = ?
         GROUP BY j.id, j.title
         ORDER BY total_applications DESC`,
        [recruiterId]
    );

    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        total_applications: Number(row.total_applications || 0),
        shortlisted: Number(row.shortlisted || 0),
        hired: Number(row.hired || 0),
    }));
};

// ─── Platform Stats (Admin) ───────────────────────────────────────────────────
// Aggregate metrics across the entire platform.
const getPlatformStats = async () => {
    // 1. Users grouped by role
    const [usersByRoleRows] = await pool.query(
        `SELECT role, COUNT(*) AS count FROM users GROUP BY role`
    );

    // 2. Total jobs
    const [totalJobsRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM jobs`
    );

    // 3. Total applications
    const [totalApplicationsRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM applications`
    );

    // 4. Total assessment attempts (defensive in case table doesn't exist yet)
    let totalAssessmentAttempts = 0;
    try {
        const [attemptsRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM assessment_attempts`
        );
        totalAssessmentAttempts = Number(attemptsRows[0]?.total || 0);
    } catch {
        totalAssessmentAttempts = 0;
    }

    const usersByRole = usersByRoleRows.map((r) => ({
        role: r.role,
        count: Number(r.count || 0),
    }));

    return {
        usersByRole,
        totalJobs: Number(totalJobsRows[0]?.total || 0),
        totalApplications: Number(totalApplicationsRows[0]?.total || 0),
        totalAssessmentAttempts,
    };
};

// ─── Assessment Leaderboard ───────────────────────────────────────────────────
// Uses a MySQL 8 WINDOW FUNCTION: RANK() OVER (ORDER BY score DESC).
//
// HOW RANK() OVER (...) DIFFERS FROM GROUP BY + ORDER BY:
//   GROUP BY collapses rows into one row per group and only allows
//   aggregates (COUNT, SUM) in the SELECT.
//   RANK() is a WINDOW FUNCTION — it computes a rank across all rows
//   WITHOUT collapsing them. Every row keeps all its columns AND gets
//   a rank column computed relative to its peers.
//
//   Ties: RANK() gives the same rank to ties and skips the next rank.
//   E.g. scores 100, 100, 80 → ranks 1, 1, 3  (rank 2 is skipped).
//   DENSE_RANK() would give 1, 1, 2 (no gap). We use RANK() here.
//
// LIMIT 20: Only fetch the top 20 to keep the payload small.
const getAssessmentLeaderboard = async (assessmentId) => {
    const [rows] = await pool.query(
        `SELECT
            u.name,
            u.email,
            at.score,
            at.submitted_at,
            RANK() OVER (ORDER BY at.score DESC) AS rank_position
         FROM assessment_attempts at
         JOIN users u ON at.candidate_id = u.id
         WHERE at.assessment_id = ?
         ORDER BY at.score DESC
         LIMIT 20`,
        [assessmentId]
    );

    return rows.map((row) => ({
        name:          row.name,
        email:         row.email,
        score:         Number(row.score),
        submitted_at:  row.submitted_at,
        rank_position: Number(row.rank_position),
    }));
};

// ─── Hiring-Speed Analytics ───────────────────────────────────────────────────
// DATEDIFF(updated_at, applied_at) computes the number of calendar days
// between two DATE or DATETIME values. MySQL returns an integer (can be
// negative if the dates are reversed, but that shouldn't happen here).
//
// WHY updated_at - applied_at?
//   applied_at  = when the candidate submitted the application
//   updated_at  = when the recruiter last changed the status (hired/rejected)
//   The delta = "time to make a decision"
//
// ONLY rows with status IN ('hired','rejected') are included:
//   Applied/under_review rows haven't had a final decision yet, so their
//   DATEDIFF would just measure "how long since applying" — not useful.
//
// AVG/MIN/MAX are standard SQL aggregate functions.
// GROUP BY j.id, j.title produces one summary row per job.
const getHiringSpeed = async (recruiterId) => {
    const [rows] = await pool.query(
        `SELECT
            j.title,
            AVG(DATEDIFF(a.updated_at, a.applied_at)) AS avg_days_to_decision,
            MIN(DATEDIFF(a.updated_at, a.applied_at)) AS fastest_decision,
            MAX(DATEDIFF(a.updated_at, a.applied_at)) AS slowest_decision
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.posted_by = ?
           AND a.status IN ('hired', 'rejected')
         GROUP BY j.id, j.title
         ORDER BY avg_days_to_decision ASC`,
        [recruiterId]
    );

    return rows.map((row) => ({
        title:                 row.title,
        avg_days_to_decision:  row.avg_days_to_decision !== null ? parseFloat(Number(row.avg_days_to_decision).toFixed(1)) : null,
        fastest_decision:      row.fastest_decision !== null ? Number(row.fastest_decision) : null,
        slowest_decision:      row.slowest_decision !== null ? Number(row.slowest_decision) : null,
    }));
};

module.exports = {
    getRecruiterJobsSummary,
    getRecruiterApplicationsPerJob,
    getPlatformStats,
    getAssessmentLeaderboard,
    getHiringSpeed,
};
