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

/*
using cluster create multiple node.js server which share the port and has seperate process id


require("dotenv").config();

const cluster = require("node:cluster");
const os = require("node:os");

const startPrimary = () => {
    // Use WORKERS from .env, otherwise use available CPU parallelism
    const workerCount =
        Number(process.env.WORKERS) || os.availableParallelism();

    console.log("=================================");
    console.log("HireAI Primary Process:", process.pid);
    console.log("Starting workers:", workerCount);
    console.log("=================================");

    for (let i = 0; i < workerCount; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(
            `Worker ${worker.process.pid} exited. Code: ${code}, Signal: ${signal}`
        );

        // Initially, log worker failures.
        // Add controlled worker restart logic after testing.
    });
};

const startWorker = async () => {
    // These modules are loaded only inside worker processes
    const config = require("./src/config/env.config");
    const app = require("./src/app");
    const pool = require("./src/config/database");

    try {
        // Each worker verifies database connectivity
        await pool.query("SELECT 1");

        console.log(
            `Database verified by worker ${process.pid}`
        );

        // Each worker starts the same Express application
        const server = app.listen(config.port, () => {
            console.log(
                `HireAI worker ${process.pid} running on port ${config.port}`
            );
        });

        // Handle server startup/runtime errors
        server.on("error", (err) => {
            console.error(`Worker ${process.pid} server error:`, err);
            process.exit(1);
        });

    } catch (err) {
        console.error(
            `Database connection failed in worker ${process.pid}:`,
            err.message
        );

        process.exit(1);
    }
};

// Decide which process should execute which function
if (cluster.isPrimary) {
    require("./src/config/migrate")()
        .catch((err) => console.error("[migrate] skipped:", err.message))
        .finally(startPrimary);
} else {
    startWorker();
}

*/