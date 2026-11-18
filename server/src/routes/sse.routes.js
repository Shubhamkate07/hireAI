/**
 * ============================================================
 * sse.routes.js — Route for the SSE connection endpoint
 * ============================================================
 *
 * Base path: /api/sse  (mounted in app.js)
 *
 * Routes:
 *   GET /api/sse/connect → open SSE stream (auth required)
 *
 * Why protected?
 *   Without authMiddleware, anyone could open a connection and
 *   receive another user's notifications. The auth check ensures
 *   req.user.id is the legitimate owner of the stream.
 * ============================================================
 */

const express        = require('express');
const sseController  = require('../controllers/sse.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { sseLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// GET /api/sse/connect
// sseLimiter prevents connection flooding (max 15 / 5m).
// authMiddleware verifies JWT cookie → populates req.user.
// Then sseController.connect opens the persistent stream.
router.get('/connect', sseLimiter, authMiddleware, sseController.connect);

module.exports = router;
