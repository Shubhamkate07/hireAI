-- Run ONCE on the existing production DB (init.sql only runs on a fresh volume).
-- If a statement fails with "Duplicate key name", that change is already applied; skip it.

-- 1. Check for duplicate attempts first. This must return 0 rows before step 3 can run.
SELECT assessment_id, candidate_id, COUNT(*) c FROM assessment_attempts
GROUP BY assessment_id, candidate_id HAVING c > 1;

-- 2. Allow long answer keys for text and coding questions.
ALTER TABLE questions MODIFY correct_answer TEXT DEFAULT NULL;

-- 3. Block double submission at the DB level.
ALTER TABLE assessment_attempts ADD UNIQUE KEY uq_attempt (assessment_id, candidate_id);

-- 4. Refresh-token lookups and cleanup.
ALTER TABLE refresh_tokens ADD UNIQUE KEY uq_token_hash (token_hash);
ALTER TABLE refresh_tokens ADD KEY idx_expires_at (expires_at);
