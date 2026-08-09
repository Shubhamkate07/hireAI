/**
 * ============================================================
 * config/redis.js — Redis client setup
 * ============================================================
 *
 * WHY ioredis?
 *   ioredis is the most popular Redis client for Node.js.
 *   It supports Promises natively (so we can use async/await),
 *   automatic reconnection, and Lua scripting.
 *
 * HOW IT WORKS:
 *   We create ONE Redis client and export it.
 *   Every file that needs Redis imports this same instance.
 *   This is the Singleton pattern — one shared connection.
 *
 * ENVIRONMENT VARIABLES:
 *   REDIS_HOST — defaults to 'localhost' (your local machine)
 *   REDIS_PORT — defaults to 6379 (Redis default port)
 * ============================================================
 */

const Redis  = require('ioredis');
const config = require('./env.config');

const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,

    // If Redis is down, don't crash the app — just log the error.
    // The service layer handles the case where cache is unavailable.
    lazyConnect: false,
});

// ── Connection lifecycle logs ─────────────────────────────────────────────────
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  // Log but don't crash — the app will still work, just without cache.
  console.error('❌ Redis error:', err.message);
});

module.exports = redis;
