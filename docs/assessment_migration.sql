-- ============================================================
-- Assessment Engine — Database Migration
-- Run this once in your MySQL database.
-- ============================================================
--
-- ARCHITECTURE NOTES:
--
-- assessments.created_by  → which recruiter/admin owns this assessment
-- assessments.job_id      → links assessment to a job posting (nullable,
--                           SET NULL if the job is deleted so we keep history)
-- questions.correct_answer → NEVER sent to candidate clients.
--                            The service strips it before responding.
--                            Scoring always happens server-side.
-- assessment_attempts      → records each candidate submission.
--                            UNIQUE (assessment_id, candidate_id) prevents
--                            double-scoring even on concurrent requests.
-- ============================================================


-- ── assessments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id                 INT          PRIMARY KEY AUTO_INCREMENT,
  title              VARCHAR(150) NOT NULL,
  description        TEXT,
  job_id             INT,
  time_limit_minutes INT          DEFAULT 30,
  created_by         INT          NOT NULL,
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)     REFERENCES jobs(id)  ON DELETE SET NULL
  -- ON DELETE SET NULL: if a job is deleted, the assessment is kept but
  -- job_id becomes NULL. We don't lose historical assessments.
);


-- ── questions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id             INT          PRIMARY KEY AUTO_INCREMENT,
  assessment_id  INT          NOT NULL,
  question_text  TEXT         NOT NULL,
  question_type  ENUM('mcq','coding','text') DEFAULT 'mcq',
  options        JSON,          -- array of option strings for MCQ
  correct_answer VARCHAR(255),  -- NEVER exposed to candidates
  points         INT          DEFAULT 10,

  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);


-- ── assessment_attempts ───────────────────────────────────────────────────────
-- INTERVIEW Q3 — submitted_answers as JSON (not separate rows):
--   • One INSERT per submission (simple, fast write path)
--   • Read the whole submission at once — no JOIN needed
--   • Tradeoff: cannot easily do per-question analytics in SQL;
--     you'd need to parse JSON in application code for that.
--
-- INTERVIEW Q4 — UNIQUE KEY for double-submission prevention:
--   Even if two concurrent requests both pass the service-level check,
--   MySQL will reject the second INSERT at the DB level (ER_DUP_ENTRY).
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id                INT       PRIMARY KEY AUTO_INCREMENT,
  assessment_id     INT       NOT NULL,
  candidate_id      INT       NOT NULL,
  score             INT       DEFAULT 0,
  submitted_answers JSON,
  started_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at      TIMESTAMP NULL,

  UNIQUE KEY uq_attempt (assessment_id, candidate_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id)  REFERENCES users(id)       ON DELETE CASCADE
);


-- ============================================================
-- SAMPLE SEED DATA (for Postman testing)
-- Assumes users table has a recruiter with id=1 and a job with id=1.
-- ============================================================

-- 1. Create an assessment linked to job 1
INSERT IGNORE INTO assessments (id, title, description, job_id, time_limit_minutes, created_by)
VALUES (1, 'Frontend Developer Quiz', 'Tests React and JS fundamentals', 1, 30, 1);

-- 2. Create 3 questions (correct_answer never leaves the server)
INSERT IGNORE INTO questions (id, assessment_id, question_text, question_type, options, correct_answer, points)
VALUES
  (1, 1,
   'Which hook is used to run side effects in React?',
   'mcq',
   '["useState", "useEffect", "useContext", "useReducer"]',
   'useEffect',
   10),

  (2, 1,
   'What does the dependency array in useEffect control?',
   'mcq',
   '["The initial state", "When the effect re-runs", "The return value", "The component key"]',
   'When the effect re-runs',
   10),

  (3, 1,
   'What is a "derived value" in React?',
   'mcq',
   '["A value in useState", "A value calculated from existing state", "A value from an API", "A prop"]',
   'A value calculated from existing state',
   10);


-- ============================================================
-- POSTMAN TESTING GUIDE
-- ============================================================
--
-- Step 1 — Login as recruiter, copy access cookie
--   POST /api/auth/login  { email, password }
--
-- Step 2 — Create an assessment (recruiter role)
--   POST /api/assessments
--   Body: {
--     "title": "My Quiz",
--     "description": "...",
--     "job_id": 1,
--     "time_limit_minutes": 30,
--     "questions": [
--       {
--         "question_text": "What does useEffect do?",
--         "question_type": "mcq",
--         "options": ["Fetches data", "Runs side effects", "Manages state", "Renders JSX"],
--         "correct_answer": "Runs side effects",
--         "points": 10
--       }
--     ]
--   }
--   EXPECT: 201, full data WITH correct_answer
--
-- Step 3 — GET as recruiter (creator)
--   GET /api/assessments/1
--   EXPECT: 200, questions WITH correct_answer included
--
-- Step 4 — Login as candidate, copy access cookie
--   POST /api/auth/login  { email, password }
--
-- Step 5 — GET as candidate
--   GET /api/assessments/1
--   EXPECT: 200, questions WITHOUT correct_answer (field stripped)
--
-- Step 6 — Submit as candidate
--   POST /api/assessments/1/submit
--   Body: {
--     "submittedAnswers": [
--       { "questionId": 1, "answer": "useEffect" },
--       { "questionId": 2, "answer": "When the effect re-runs" },
--       { "questionId": 3, "answer": "A value calculated from existing state" }
--     ]
--   }
--   EXPECT: 201, { score: 30, totalPossible: 30 }
--
-- Step 7 — Submit again as same candidate
--   POST /api/assessments/1/submit  (same body)
--   EXPECT: 409 Conflict "You have already submitted this assessment"
--
-- Step 8 — Try to submit as recruiter
--   POST /api/assessments/1/submit (with recruiter cookie)
--   EXPECT: 403 Forbidden
