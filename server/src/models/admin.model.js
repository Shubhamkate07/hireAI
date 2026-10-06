const pool = require('../config/database');

/**
 * ============================================================
 * admin.model.js — Data Access Layer for Admin Management
 * ============================================================
 */

// ── User Management ─────────────────────────────────────────────────────────
const updateUserRole = async (userId, role) => {
  const [result] = await pool.query(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, userId]
  );
  return result.affectedRows > 0;
};

const updateUserStatus = async (userId, isActive) => {
  const [result] = await pool.query(
    'UPDATE users SET is_active = ? WHERE id = ?',
    [isActive ? 1 : 0, userId]
  );
  return result.affectedRows > 0;
};

const bulkDeactivateUsers = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  const [result] = await pool.query(
    'UPDATE users SET is_active = 0 WHERE id IN (?) AND role != ?',
    [userIds, 'admin']
  );
  return result.affectedRows;
};

// ── Job Management ──────────────────────────────────────────────────────────
const updateJobStatus = async (jobId, status) => {
  const [result] = await pool.query(
    'UPDATE jobs SET status = ? WHERE id = ?',
    [status, jobId]
  );
  return result.affectedRows > 0;
};

const deleteJob = async (jobId) => {
  const [result] = await pool.query(
    'DELETE FROM jobs WHERE id = ?',
    [jobId]
  );
  return result.affectedRows > 0;
};

// ── Assessment Management ────────────────────────────────────────────────────
const getAllAssessmentsWithCounts = async () => {
  const [rows] = await pool.query(`
    SELECT 
      a.id, 
      a.title, 
      a.description, 
      a.job_id, 
      a.time_limit_minutes, 
      a.created_by, 
      a.created_at,
      u.name AS creator_name, 
      u.email AS creator_email,
      j.title AS job_title,
      COUNT(DISTINCT q.id) AS question_count,
      COUNT(DISTINCT aa.id) AS attempt_count
    FROM assessments a
    LEFT JOIN users u ON a.created_by = u.id
    LEFT JOIN jobs j ON a.job_id = j.id
    LEFT JOIN questions q ON a.id = q.assessment_id
    LEFT JOIN assessment_attempts aa ON a.id = aa.assessment_id
    GROUP BY a.id, a.title, a.description, a.job_id, a.time_limit_minutes, a.created_by, a.created_at, u.name, u.email, j.title
    ORDER BY a.created_at DESC
  `);
  return rows;
};

const getAssessmentFull = async (assessmentId) => {
  const [assessmentRows] = await pool.query(`
    SELECT a.*, j.title AS job_title 
    FROM assessments a 
    LEFT JOIN jobs j ON a.job_id = j.id 
    WHERE a.id = ?
  `, [assessmentId]);

  if (assessmentRows.length === 0) return null;
  const assessment = assessmentRows[0];

  const [questionRows] = await pool.query(
    'SELECT * FROM questions WHERE assessment_id = ? ORDER BY id ASC',
    [assessmentId]
  );

  const formattedQuestions = questionRows.map((q) => {
    let parsedOptions = q.options;
    if (typeof parsedOptions === 'string') {
      try {
        parsedOptions = JSON.parse(parsedOptions);
      } catch (e) {
        parsedOptions = [];
      }
    }
    return {
      ...q,
      options: Array.isArray(parsedOptions) ? parsedOptions : []
    };
  });

  return {
    ...assessment,
    questions: formattedQuestions
  };
};

const updateAssessment = async (assessmentId, { title, description, time_limit_minutes, job_id }) => {
  const [result] = await pool.query(
    `UPDATE assessments 
     SET title = ?, description = ?, time_limit_minutes = ?, job_id = ? 
     WHERE id = ?`,
    [title, description, time_limit_minutes, job_id || null, assessmentId]
  );
  return result.affectedRows > 0;
};

const deleteAssessment = async (assessmentId) => {
  const [result] = await pool.query(
    'DELETE FROM assessments WHERE id = ?',
    [assessmentId]
  );
  return result.affectedRows > 0;
};

// ── Question Management ──────────────────────────────────────────────────────
const addQuestion = async (assessmentId, { question_text, question_type, options, correct_answer, points }) => {
  const optionsJson = JSON.stringify(options || []);
  const [result] = await pool.query(
    `INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, points)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [assessmentId, question_text, question_type || 'mcq', optionsJson, correct_answer, points || 10]
  );
  return result.insertId;
};

const updateQuestion = async (questionId, { question_text, question_type, options, correct_answer, points }) => {
  const optionsJson = JSON.stringify(options || []);
  const [result] = await pool.query(
    `UPDATE questions 
     SET question_text = ?, question_type = ?, options = ?, correct_answer = ?, points = ? 
     WHERE id = ?`,
    [question_text, question_type || 'mcq', optionsJson, correct_answer, points || 10, questionId]
  );
  return result.affectedRows > 0;
};

const deleteQuestion = async (questionId) => {
  const [result] = await pool.query(
    'DELETE FROM questions WHERE id = ?',
    [questionId]
  );
  return result.affectedRows > 0;
};

// ── Activity Log ─────────────────────────────────────────────────────────────
const getActivityLog = async (limit = 50, offset = 0, typeFilter = 'all') => {
  let query = `
    SELECT * FROM (
      SELECT 
        CONCAT('app_', app.id) AS id,
        'application' AS type,
        CONCAT('Candidate applied to "', j.title, '"') AS event,
        u.name AS user_name,
        u.email AS user_email,
        app.applied_at AS created_at
      FROM applications app
      JOIN users u ON app.candidate_id = u.id
      JOIN jobs j ON app.job_id = j.id

      UNION ALL

      SELECT 
        CONCAT('user_', u.id) AS id,
        'registration' AS type,
        CONCAT('New user registered as ', u.role) AS event,
        u.name AS user_name,
        u.email AS user_email,
        u.created_at AS created_at
      FROM users u

      UNION ALL

      SELECT 
        CONCAT('attempt_', aa.id) AS id,
        'assessment' AS type,
        CONCAT('Assessment submitted — score ', aa.score) AS event,
        u.name AS user_name,
        u.email AS user_email,
        aa.submitted_at AS created_at
      FROM assessment_attempts aa
      JOIN users u ON aa.candidate_id = u.id
      WHERE aa.submitted_at IS NOT NULL

      UNION ALL

      SELECT 
        CONCAT('job_', j.id) AS id,
        'job_posted' AS type,
        CONCAT('Job posted: "', j.title, '" at ', j.company) AS event,
        u.name AS user_name,
        u.email AS user_email,
        j.created_at AS created_at
      FROM jobs j
      JOIN users u ON j.posted_by = u.id
    ) AS activity_stream
  `;

  const values = [];

  if (typeFilter && typeFilter !== 'all') {
    query += ` WHERE type = ?`;
    values.push(typeFilter);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  values.push(Number(limit), Number(offset));

  const [rows] = await pool.query(query, values);
  return rows;
};

module.exports = {
  updateUserRole,
  updateUserStatus,
  bulkDeactivateUsers,
  updateJobStatus,
  deleteJob,
  getAllAssessmentsWithCounts,
  getAssessmentFull,
  updateAssessment,
  deleteAssessment,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getActivityLog,
};
