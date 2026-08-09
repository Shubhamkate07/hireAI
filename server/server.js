/**
 * ============================================================
 * server.js — Application Entry Point
 * ============================================================
 *
 * WHAT THIS FILE IS RESPONSIBLE FOR:
 *   1. Load dotenv FIRST — before any other module reads process.env
 *   2. Import the centralized config (which validates required vars)
 *   3. Run a DB connectivity check BEFORE binding the port
 *   4. Start listening only after confirming the DB is reachable
 *
 * WHY STARTUP DB CHECK?
 *   If the DB is unreachable (wrong credentials, DB host down),
 *   starting the server produces a partially-working app that returns
 *   500 errors on every data request — confusing and hard to debug.
 *   Checking connectivity at startup means:
 *     - The container/process immediately exits with code 1
 *     - Docker / systemd / Kubernetes marks it as failed and restarts
 *     - Logs clearly show "Database connection failed at startup"
 *   This is the fail-fast principle — fail loudly, early, with context.
 *
 * 12-FACTOR APP:
 *   Config (Task 3) — all runtime config comes from env vars via env.config.js.
 *   No environment-specific if/else in business logic, only in startup/config.
 * ============================================================
 */

require('dotenv').config();              // Step 1: load .env BEFORE anything else
const config = require('./src/config/env.config'); // Step 2: validate + centralise config
const app    = require('./src/app');
const pool   = require('./src/config/database');

/**
 * startServer — async startup sequence
 *
 * TASK 4: Database connectivity check
 *   pool.query('SELECT 1') is the canonical "ping" for MySQL.
 *   It executes a trivial query that touches the DB without reading any table.
 *   On success → the pool is connected and we start listening.
 *   On failure → log a clear error and exit(1) immediately.
 */
const startServer = async () => {
    try {
        // ── DB health check ────────────────────────────────────────────────────
        await pool.query('SELECT 1');
        console.log('✅ Database connection verified');

        // ── Start HTTP server ──────────────────────────────────────────────────
        app.listen(config.port, () => {
            console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);

            if (config.isProd) {
                console.log('🔒 Production mode: trust proxy enabled, x-powered-by disabled');
            }
        });

    } catch (err) {
        console.error('');
        console.error('╔══════════════════════════════════════════════════════════╗');
        console.error('║  FATAL: Database connection failed at startup            ║');
        console.error(`║  ${err.message.substring(0, 55).padEnd(55)} ║`);
        console.error('╠══════════════════════════════════════════════════════════╣');
        console.error('║  → Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env ║');
        console.error('║  → Ensure MySQL / Docker DB container is running         ║');
        console.error('╚══════════════════════════════════════════════════════════╝');
        console.error('');
        process.exit(1);
    }
};

startServer();