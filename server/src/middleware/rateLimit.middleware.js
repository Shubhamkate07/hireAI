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
    max: 10,                   // 10 attempts per window
    keyGenerator: (req) => {
        // Extract true client IP from X-Forwarded-For header if behind reverse proxy/AWS ALB, or req.ip
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = forwarded
            ? String(forwarded).split(',')[0].trim()
            : req.ip || '127.0.0.1';

        // Target email if present in request body
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';

        // Key by clientIp + email so one user failing logins doesn't block other users or IPs
        return email ? `${clientIp}_${email}` : clientIp;
    },
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

module.exports = authLimiter;