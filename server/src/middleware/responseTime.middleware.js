/**
 * ============================================================
 * responseTime.middleware.js — High-precision Performance Monitor
 * ============================================================
 *
 * Uses process.hrtime.bigint() for nanosecond-precision elapsed timing.
 * Logs response times to console and sets the X-Response-Time header.
 */

const responseTimeMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();

    // Hook res.end to set header before headers are sent to socket
    const originalEnd = res.end;
    res.end = function (...args) {
        if (!res.headersSent) {
            const durationNs = process.hrtime.bigint() - start;
            const durationMs = Number(durationNs) / 1e6;
            res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
        }
        return originalEnd.apply(this, args);
    };

    res.on('finish', () => {
        const durationNs = process.hrtime.bigint() - start;
        const durationMs = Number(durationNs) / 1e6;
        const formatted = `${durationMs.toFixed(2)}ms`;

        if (durationMs > 100) {
            console.log(`⚠️ SLOW ENDPOINT: ${req.method} ${req.originalUrl || req.path} ${res.statusCode} in ${formatted}`);
        } else {
            console.log(`⏱️  ${req.method} ${req.originalUrl || req.path} ${res.statusCode} ${formatted}`);
        }
    });

    next();
};

module.exports = responseTimeMiddleware;
