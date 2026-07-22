/**
 * ============================================================
 * notification.routes.js — Notification API Routes
 * ============================================================
 *
 * Base path: /api/notifications  (registered in app.js)
 *
 * All routes require auth (any role — candidates and recruiters both
 * receive notifications).
 *
 * Routes:
 *   GET   /api/notifications             → all notifications (or ?unread=true)
 *   PATCH /api/notifications/read-all    → mark all as read   ← BEFORE /:id
 *   PATCH /api/notifications/:id/read   → mark one as read
 *
 * ⚠️  ROUTE ORDER:
 *   '/read-all' MUST be registered BEFORE '/:id/read'.
 *   If /:id comes first, Express matches '/read-all' as { id: 'read-all' }
 *   and calls the wrong handler.
 * ============================================================
 */

const express                  = require('express');
const notificationController   = require('../controllers/notification.controller');
const authMiddleware           = require('../middleware/auth.middleware');

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

// ─── GET /api/notifications ───────────────────────────────────────────────────
// All notifications for the logged-in user (newest first).
// Add ?unread=true to filter to unread only.
router.get('/', notificationController.getNotifications);

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// MUST be before /:id/read so 'read-all' isn't matched as an :id param.
router.patch('/read-all', notificationController.markAllRead);

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// Mark a specific notification as read.
router.patch('/:id/read', notificationController.markOneRead);

module.exports = router;
