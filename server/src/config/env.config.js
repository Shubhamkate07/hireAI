/**
 * ============================================================
 * config/env.config.js — Centralised Environment Configuration
 * ============================================================
 *
 * 12-FACTOR APP — FACTOR III: CONFIG
 *   "Store config in the environment."
 *   All configuration that varies between deploys (dev, staging, prod)
 *   must come from environment variables — never hard-coded in source.
 *   This file is the SINGLE import point for all config. Business logic
 *   imports config.X, never process.env.X directly.
 *
 * WHY FAIL LOUDLY AT STARTUP?
 *   If JWT_SECRET is missing and we continue, the first login request
 *   will crash with an opaque error — after a user has already waited.
 *   Failing at startup produces a clear, immediate error message that
 *   points to the EXACT missing variable. The app never enters a
 *   partially-working state that's hard to debug.
 *   process.exit(1) = non-zero exit code → Docker/systemd marks as failed
 *   and restarts with visibility, rather than silently serving broken requests.
 *
 * USAGE:
 *   const config = require('./config/env.config');
 *   config.jwt.secret     // JWT_SECRET
 *   config.isDev          // true in development
 *   config.corsOrigins    // ['http://localhost:5173'] or your prod domain
 * ============================================================
 */

const config = {
    // ── Runtime environment ────────────────────────────────────────────────────
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev:   process.env.NODE_ENV === 'development',
    isProd:  process.env.NODE_ENV === 'production',

    // ── Server ────────────────────────────────────────────────────────────────
    port: parseInt(process.env.PORT, 10) || 5000,

    // ── CORS ──────────────────────────────────────────────────────────────────
    // Production: set CORS_ORIGINS=https://yourdomain.com
    // Multiple: CORS_ORIGINS=https://app.com,https://admin.app.com
    // Development: defaults to localhost Vite dev server
    corsOrigins: process.env.CORS_ORIGINS?.split(',').map(o => o.trim())
        || ['http://localhost:5173'],

    // ── Database ──────────────────────────────────────────────────────────────
    db: {
        host:            process.env.DB_HOST,
        user:            process.env.DB_USER,
        password:        process.env.DB_PASSWORD,
        name:            process.env.DB_NAME,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    },

    // ── JWT ───────────────────────────────────────────────────────────────────
    // WHY two secrets?
    //   Access token (15m) — short-lived, used on every API request
    //   Refresh token (7d) — long-lived, used only to get a new access token
    //   Separate secrets mean a leaked access secret doesn't compromise refresh tokens.
    jwt: {
        secret:            process.env.JWT_SECRET,
        expiresIn:         process.env.JWT_EXPIRES_IN     || '15m',
        refreshSecret:     process.env.REFRESH_TOKEN_SECRET,
        refreshExpiresIn:  process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },

    // ── Redis ─────────────────────────────────────────────────────────────────
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },

    // ── Upload limits ─────────────────────────────────────────────────────────
    upload: {
        maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 5,
    },
};

// ── Startup Validation ────────────────────────────────────────────────────────
// These variables have no safe defaults — running without them would produce
// silent auth failures or DB connection errors on the first real request.
// We crash immediately with a clear, actionable error instead.
const REQUIRED = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  FATAL: Missing required environment variables           ║');
    console.error('╠══════════════════════════════════════════════════════════╣');
    missing.forEach((key) => console.error(`║  ✗ ${key.padEnd(54)}║`));
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  → Copy .env.example to .env and fill in all values     ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1); // non-zero exit → Docker/systemd marks this as a crash
}

module.exports = config;
