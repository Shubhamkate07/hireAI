/**
 * Idempotent schema sync for existing databases (init.sql only runs on a fresh
 * MySQL volume). Runs once in the cluster primary before workers start.
 * Never throws: a failed step is logged and startup continues.
 */
const pool = require('./database');

const hasIndex = async (table, index) => {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
        [table, index]
    );
    return rows.length > 0;
};

const steps = [
    {
        name: 'questions.correct_answer -> TEXT',
        needed: async () => {
            const [rows] = await pool.query(
                `SELECT data_type FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'questions' AND column_name = 'correct_answer'`
            );
            return rows.length > 0 && String(rows[0].data_type || rows[0].DATA_TYPE).toLowerCase() !== 'text';
        },
        sql: 'ALTER TABLE questions MODIFY correct_answer TEXT DEFAULT NULL',
    },
    {
        name: 'assessment_attempts.uq_attempt',
        needed: async () => !(await hasIndex('assessment_attempts', 'uq_attempt')),
        sql: 'ALTER TABLE assessment_attempts ADD UNIQUE KEY uq_attempt (assessment_id, candidate_id)',
    },
    {
        name: 'refresh_tokens.uq_token_hash',
        needed: async () => !(await hasIndex('refresh_tokens', 'uq_token_hash')),
        sql: 'ALTER TABLE refresh_tokens ADD UNIQUE KEY uq_token_hash (token_hash)',
    },
    {
        name: 'refresh_tokens.idx_expires_at',
        needed: async () => !(await hasIndex('refresh_tokens', 'idx_expires_at')),
        sql: 'ALTER TABLE refresh_tokens ADD KEY idx_expires_at (expires_at)',
    },
];

const runMigrations = async () => {
    for (const step of steps) {
        try {
            if (await step.needed()) {
                await pool.query(step.sql);
                console.log(`[migrate] applied: ${step.name}`);
            }
        } catch (err) {
            console.error(`[migrate] FAILED: ${step.name}: ${err.message}`);
        }
    }
};

module.exports = runMigrations;
