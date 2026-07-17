const pool = require('../config/database');

// ─── Create a new application ─────────────────────────────────────────────────
// Inserts one row with the optional resume_path.
// If the UNIQUE KEY (job_id, candidate_id) is violated,
// MySQL throws error code ER_DUP_ENTRY — caught in the service layer.
const createApplication = async (jobId, candidateId, resumePath = null) => {

    const [result] = await pool.query(
        `INSERT INTO applications (job_id, candidate_id, resume_path)
         VALUES (?, ?, ?)`,
        [jobId, candidateId, resumePath]
    );

    return result.insertId;

};

// ─── Find all applications for a job (with candidate info) ───────────────────
// This is a JOIN query — one SQL call returns both the application row
// AND the matching user row, so we don't need a second query per applicant.
// resume_path is included so recruiters can see / download the resume.
const findApplicationsByJob = async (jobId) => {

    const [rows] = await pool.query(
        `SELECT
            applications.id          AS application_id,
            applications.status,
            applications.applied_at,
            applications.resume_path,
            users.id                 AS candidate_id,
            users.name               AS candidate_name,
            users.email              AS candidate_email
        FROM applications
        JOIN users ON applications.candidate_id = users.id
        WHERE applications.job_id = ?
        ORDER BY applications.applied_at DESC`,
        [jobId]
    );

    return rows;

};

// ─── Find all applications made by a single candidate ────────────────────────
// Used by GET /api/applications/my
const findApplicationsByCandidate = async (candidateId) => {

    const [rows] = await pool.query(
        `SELECT
            applications.id          AS application_id,
            applications.status,
            applications.applied_at,
            applications.resume_path,
            jobs.id                  AS job_id,
            jobs.title               AS job_title,
            jobs.company,
            jobs.location,
            jobs.job_type
        FROM applications
        JOIN jobs ON applications.job_id = jobs.id
        WHERE applications.candidate_id = ?
        ORDER BY applications.applied_at DESC`,
        [candidateId]
    );

    return rows;

};

// ─── Update the status of an application ─────────────────────────────────────
// e.g. recruiter moves it from 'applied' → 'shortlisted'
const updateApplicationStatus = async (applicationId, status) => {

    await pool.query(
        `UPDATE applications SET status = ? WHERE id = ?`,
        [status, applicationId]
    );

    // Return the updated row
    const [rows] = await pool.query(
        `SELECT * FROM applications WHERE id = ?`,
        [applicationId]
    );

    return rows[0];

};

module.exports = {
    createApplication,
    findApplicationsByJob,
    findApplicationsByCandidate,
    updateApplicationStatus,
};
