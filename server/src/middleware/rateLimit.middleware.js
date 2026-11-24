/**
 * ============================================================
 * rateLimit.middleware.js — Route Rate Limiting Configuration
 * ============================================================
 *
 * Configures rate limiters for high-risk endpoints:
 *   1. authLimiter: 10 login/auth attempts per 15 minutes (key: IP + Email)
 *   2. applyLimiter: 10 job applications per 15 minutes (key: IP + User ID)
 *   3. sseLimiter: 15 SSE stream connections per 5 minutes (key: IP + User ID)
 *
 * HOW RATE LIMITING SCALES TO MILLIONS OF USERS WORLDWIDE:
 *   - Limits are NEVER global across all users on your server.
 *   - Each limit is calculated PER UNIQUE CLIENT (IP + User ID).
 *   - 1,000,000 different users from 1,000,000 devices can connect simultaneously.
 *   - Combining clientIp + userId ensures users sharing an office/college Wi-Fi IP
 *     never block each other!
 * ============================================================
 */
const rateLimit = require('express-rate-limit');

// Helper: extract true client IP from reverse proxies (AWS ALB / Nginx)
// With `trust proxy` in app.js and nginx overwriting X-Forwarded-For to $remote_addr,
// req.ip reliably contains the authentic client IP and cannot be spoofed.
const getClientIp = (req) => req.ip;

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window
    keyGenerator: (req) => {
        const clientIp = getClientIp(req);
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
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

const applyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // 10 applications per 15 mins per user
    keyGenerator: (req) => {
        const clientIp = getClientIp(req);
        const userId = req.user?.id || req.user?.userId;
        return userId ? `${clientIp}_user_${userId}` : clientIp;
    },
    message: {
        success: false,
        message: 'Too many job applications submitted. Please slow down and try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

const sseLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 15,                  // 15 SSE connections per 5 mins per user
    keyGenerator: (req) => {
        const clientIp = getClientIp(req);
        const userId = req.user?.id || req.user?.userId;
        return userId ? `${clientIp}_user_${userId}` : clientIp;
    },
    message: {
        success: false,
        message: 'Too many real-time connection attempts. Please try again shortly.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

module.exports = {
    authLimiter,
    applyLimiter,
    sseLimiter,
};