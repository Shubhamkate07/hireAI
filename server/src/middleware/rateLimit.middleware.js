/**
 * ============================================================
 * rateLimit.middleware.js — Auth Route Rate Limiting
 * ============================================================
 *
 * WHY limit to 10 per 15 minutes?
 *   10 attempts × 15-min window is generous for legitimate users
 *   (forgot password, typo) but stops automated brute-force tools
 *   that can send thousands of requests per second.
 *
 * standardHeaders: true  → includes RateLimit-* headers (RFC 6585)
 * legacyHeaders: false   → suppresses deprecated X-RateLimit-* headers
 *
 * SECURITY REVIEW (Task 3): try 15 rapid login attempts →
 *   the 11th will receive HTTP 429 with the message below.
 * ============================================================
 */
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window per IP
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = authLimiter;