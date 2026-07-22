/**
 * ============================================================
 * seed.js — Development data seeder for HireAI
 * ============================================================
 *
 * WHAT IT CREATES (idempotently — safe to re-run):
 *   1. A recruiter user    recruiter@hireai.dev / Recruiter@123
 *   2. A candidate user    candidate@hireai.dev / Candidate@123
 *   3. Job 1 (open)        "Senior Node.js Engineer"  — posted by recruiter
 *   4. Job 2 (closed)      "React Frontend Developer" — posted by recruiter
 *   5. Application         candidate → Job 1 (status: applied)
 *   6. Assessment          3-question MCQ linked to Job 1
 *
 * IDEMPOTENCY STRATEGY:
 *   Users    → looked up by email; created only if not found.
 *   Jobs     → looked up by title + posted_by; created only if not found.
 *   Application → looked up by (job_id, candidate_id); created only if not found.
 *   Assessment  → looked up by job_id; created only if not found.
 *
 * HOW TO RUN:
 *   npm run seed
 * ============================================================
 */

'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool   = require('../config/database');

// ─── Seed data ────────────────────────────────────────────────────────────────

const RECRUITER = {
    name:     'Alice Recruiter',
    email:    'recruiter@hireai.dev',
    password: 'Recruiter@123',
    role:     'recruiter',
};

const CANDIDATE = {
    name:     'Bob Candidate',
    email:    'candidate@hireai.dev',
    password: 'Candidate@123',
    role:     'candidate',
};

const JOBS = [
    {
        title:       'Senior Node.js Engineer',
        description: 'Build and maintain scalable REST APIs and microservices using Node.js, Express, and MySQL. You will own the backend of HireAI end-to-end.',
        company:     'HireAI Inc.',
        location:    'Remote',
        salary_min:  80000,
        salary_max:  120000,
        job_type:    'full-time',
        status:      'open',
    },
    {
        title:       'React Frontend Developer',
        description: 'Design and implement responsive UIs for HireAI using React 18, TypeScript, and Tailwind CSS. Work closely with designers and the backend team.',
        company:     'HireAI Inc.',
        location:    'Bangalore',
        salary_min:  60000,
        salary_max:  90000,
        job_type:    'full-time',
        status:      'closed',
    },
];

const ASSESSMENT = {
    title:               'Node.js Backend Fundamentals',
    description:         'A short quiz to assess core Node.js, REST, and database knowledge.',
    time_limit_minutes:  20,
    questions: [
        {
            question_text:  'Which Node.js module provides the EventEmitter class?',
            question_type:  'mcq',
            options:        ['events', 'http', 'stream', 'net'],
            correct_answer: 'events',
            points:         10,
        },
        {
            question_text:  'What HTTP status code should a successful POST that creates a resource return?',
            question_type:  'mcq',
            options:        ['200', '201', '204', '400'],
            correct_answer: '201',
            points:         10,
        },
        {
            question_text:  'Which SQL clause is used to filter rows AFTER a GROUP BY?',
            question_type:  'mcq',
            options:        ['WHERE', 'HAVING', 'FILTER', 'LIMIT'],
            correct_answer: 'HAVING',
            points:         10,
        },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a user by email, or create them if they don't exist.
 * Returns the user row.
 */
async function upsertUser({ name, email, password, role }) {
    const [existing] = await pool.query(
        'SELECT id, name, email, role FROM users WHERE email = ?',
        [email]
    );
    if (existing.length > 0) {
        console.log(`  ↩ User already exists: ${email} (id=${existing[0].id})`);
        return existing[0];
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, role]
    );
    const userId = result.insertId;
    console.log(`  ✅ Created ${role}: ${email} (id=${userId})`);
    return { id: userId, name, email, role };
}

/**
 * Find a job by title + posted_by, or create it.
 * Returns the job row.
 */
async function upsertJob(jobData, postedBy) {
    const [existing] = await pool.query(
        'SELECT id, title, status FROM jobs WHERE title = ? AND posted_by = ?',
        [jobData.title, postedBy]
    );
    if (existing.length > 0) {
        console.log(`  ↩ Job already exists: "${jobData.title}" (id=${existing[0].id})`);
        return existing[0];
    }

    const [result] = await pool.query(
        `INSERT INTO jobs (title, description, company, location, salary_min, salary_max, job_type, status, posted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            jobData.title,
            jobData.description,
            jobData.company,
            jobData.location,
            jobData.salary_min,
            jobData.salary_max,
            jobData.job_type,
            jobData.status,
            postedBy,
        ]
    );
    const jobId = result.insertId;
    console.log(`  ✅ Created job [${jobData.status}]: "${jobData.title}" (id=${jobId})`);
    return { id: jobId, title: jobData.title, status: jobData.status };
}

/**
 * Find an application by (job_id, candidate_id), or create it.
 */
async function upsertApplication(jobId, candidateId) {
    const [existing] = await pool.query(
        'SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?',
        [jobId, candidateId]
    );
    if (existing.length > 0) {
        console.log(`  ↩ Application already exists (id=${existing[0].id})`);
        return existing[0];
    }

    const [result] = await pool.query(
        'INSERT INTO applications (job_id, candidate_id, resume_path, status) VALUES (?, ?, NULL, ?)',
        [jobId, candidateId, 'applied']
    );
    const appId = result.insertId;
    console.log(`  ✅ Created application: candidate ${candidateId} → job ${jobId} (id=${appId})`);
    return { id: appId };
}

/**
 * Find an assessment by job_id, or create it with its questions.
 */
async function upsertAssessment(assessmentData, jobId, createdBy) {
    const [existing] = await pool.query(
        'SELECT id, title FROM assessments WHERE job_id = ?',
        [jobId]
    );
    if (existing.length > 0) {
        console.log(`  ↩ Assessment already exists: "${existing[0].title}" (id=${existing[0].id})`);
        return existing[0];
    }

    // Insert the assessment header
    const [aResult] = await pool.query(
        'INSERT INTO assessments (title, description, job_id, time_limit_minutes, created_by) VALUES (?, ?, ?, ?, ?)',
        [
            assessmentData.title,
            assessmentData.description,
            jobId,
            assessmentData.time_limit_minutes,
            createdBy,
        ]
    );
    const assessmentId = aResult.insertId;
    console.log(`  ✅ Created assessment: "${assessmentData.title}" (id=${assessmentId})`);

    // Insert each question
    for (const q of assessmentData.questions) {
        await pool.query(
            `INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, points)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                assessmentId,
                q.question_text,
                q.question_type,
                JSON.stringify(q.options),
                q.correct_answer,
                q.points,
            ]
        );
        console.log(`    ✅ Question: "${q.question_text.substring(0, 50)}..."`);
    }

    return { id: assessmentId };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('\n🌱 HireAI Seed Script Starting...\n');

    try {

        // 1. Seed users
        console.log('👤 Seeding users...');
        const recruiter = await upsertUser(RECRUITER);
        const candidate = await upsertUser(CANDIDATE);
        console.log();

        // 2. Seed jobs
        console.log('💼 Seeding jobs...');
        const openJob   = await upsertJob(JOBS[0], recruiter.id);
        const closedJob = await upsertJob(JOBS[1], recruiter.id);
        console.log();

        // 3. Seed application (candidate → open job only; closed job rejects applies)
        console.log('📄 Seeding application...');
        await upsertApplication(openJob.id, candidate.id);
        console.log();

        // 4. Seed assessment linked to the open job
        console.log('📝 Seeding assessment...');
        await upsertAssessment(ASSESSMENT, openJob.id, recruiter.id);
        console.log();

        console.log('✅ Seed complete!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 Quick reference for Postman / curl:\n');
        console.log(`  Recruiter  login → POST /api/auth/login`);
        console.log(`             email:    ${RECRUITER.email}`);
        console.log(`             password: ${RECRUITER.password}\n`);
        console.log(`  Candidate  login → POST /api/auth/login`);
        console.log(`             email:    ${CANDIDATE.email}`);
        console.log(`             password: ${CANDIDATE.password}\n`);
        console.log(`  Open Job   id → ${openJob.id}`);
        console.log(`  Closed Job id → ${closedJob.id}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (err) {
        console.error('\n❌ Seed failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        // Always close the DB connection pool so the process can exit cleanly
        await pool.end();
    }
}

seed();
