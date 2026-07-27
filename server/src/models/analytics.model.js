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

module.exports = {
    getRecruiterJobsSummary,
    getRecruiterApplicationsPerJob,
    getPlatformStats,
};
