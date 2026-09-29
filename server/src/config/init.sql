-- ============================================================
-- init.sql — Database initialization schema for HireAI
-- ============================================================

CREATE DATABASE IF NOT EXISTS hireai_db;
USE hireai_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','recruiter','candidate') DEFAULT 'candidate',
  is_active TINYINT(1) DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  company VARCHAR(150) NOT NULL,
  location VARCHAR(150) DEFAULT NULL,
  salary_min INT DEFAULT NULL,
  salary_max INT DEFAULT NULL,
  job_type ENUM('full-time','part-time','contract','internship') DEFAULT 'full-time',
  posted_by INT NOT NULL,
  status ENUM('draft','open','closed') DEFAULT 'open',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY posted_by (posted_by),
  CONSTRAINT jobs_ibfk_1 FOREIGN KEY (posted_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id INT NOT NULL AUTO_INCREMENT,
  job_id INT NOT NULL,
  candidate_id INT NOT NULL,
  resume_path VARCHAR(255) DEFAULT NULL,
  status ENUM('applied','under_review','shortlisted','rejected','hired') DEFAULT 'applied',
  notes TEXT,
  applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_application (job_id, candidate_id),
  KEY candidate_id (candidate_id),
  CONSTRAINT applications_ibfk_1 FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  CONSTRAINT applications_ibfk_2 FOREIGN KEY (candidate_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  job_id INT DEFAULT NULL,
  time_limit_minutes INT DEFAULT '30',
  created_by INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY created_by (created_by),
  KEY job_id (job_id),
  CONSTRAINT assessments_ibfk_1 FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT assessments_ibfk_2 FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id INT NOT NULL AUTO_INCREMENT,
  assessment_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('mcq','coding','text') DEFAULT 'mcq',
  options JSON DEFAULT NULL,
  correct_answer VARCHAR(255) DEFAULT NULL,
  points INT DEFAULT '10',
  PRIMARY KEY (id),
  KEY assessment_id (assessment_id),
  CONSTRAINT questions_ibfk_1 FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Assessment Attempts Table
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INT NOT NULL AUTO_INCREMENT,
  assessment_id INT NOT NULL,
  candidate_id INT NOT NULL,
  score INT DEFAULT '0',
  submitted_answers JSON DEFAULT NULL,
  started_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY assessment_id (assessment_id),
  KEY candidate_id (candidate_id),
  CONSTRAINT assessment_attempts_ibfk_1 FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
  CONSTRAINT assessment_attempts_ibfk_2 FOREIGN KEY (candidate_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT,
  is_read TINYINT(1) DEFAULT '0',
  reference_id INT DEFAULT NULL,
  reference_type VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT notifications_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT refresh_tokens_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- INDEX DECLARATIONS (Added after all table creations)
-- ============================================================

-- Jobs Indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at);

-- Applications Indexes
CREATE INDEX idx_applications_status ON applications(status);

-- Notifications Indexes
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
