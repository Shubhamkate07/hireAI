/**
 * ============================================================
 * notification.service.js — Business logic for notifications
 * ============================================================
 *
 * Thin service layer. Most of the work is in the model.
 * The service exists to:
 *   1. Be the single import point other services use
 *      (recruiter.service imports THIS, not the model directly)
 *   2. Allow business rules to be added here later without
 *      changing every caller
 *
 * SSE Integration:
 *   createNotification now also calls sseService.sendToUser AFTER
 *   the DB insert. This is the "bridge" between the DB and the
 *   live push channel.
 *
 *   WHY after the insert (not before)?
 *   If the push fails, the notification is still safely in the DB.
 *   If the push comes before the insert and the insert fails, the
 *   browser would show a notification that doesn't exist in the DB
 *   — an inconsistency.
 * ============================================================
 */

const notificationModel = require('../models/notification.model');

// ── Lazy-load sseService to avoid circular dependency issues ─────────────────
// notification.service ← recruiter.service ← (any route)
// sse.service ← notification.service (this file)
// Using require() inside the function body resolves the circular concern
// because by the time createNotification is called, both modules are fully loaded.
let sseService;
const getSseService = () => {
    if (!sseService) {
        sseService = require('./sse.service');
    }
    return sseService;
};

// ─── createNotification ───────────────────────────────────────────────────────
// 1. Insert notification into DB
// 2. Push the new notification to the user's SSE connection (if they're online)
// 3. Return the created notification
const createNotification = async (
    userId,
    type,
    title,
    message,
    referenceId = null,
    referenceType = null
) => {
    // Step 1: Persist to DB first — this is the source of truth
    const notification = await notificationModel.createNotification(
        userId,
        type,
        title,
        message,
        referenceId,
        referenceType
    );

    // Step 2: Push to the user's open SSE connection (fire-and-forget)
    // If the user isn't connected, sendToUser is a no-op (safe to call always)
    getSseService().sendToUser(userId, {
        type: 'new_notification',
        notification,
    });

    return notification;
};

// ─── getNotifications ─────────────────────────────────────────────────────────
// Returns all (or only unread) notifications for the logged-in user.
const getNotifications = async (userId, onlyUnread = false) => {
    return notificationModel.findNotificationsByUser(userId, onlyUnread);
};

// ─── getUnread ────────────────────────────────────────────────────────────────
// Used by the SSE controller on initial connection — delivers all unread
// notifications to the freshly connected client.
const getUnread = async (userId) => {
    return notificationModel.findNotificationsByUser(userId, true);
};

// ─── markOneAsRead ────────────────────────────────────────────────────────────
const markOneAsRead = async (notificationId, userId) => {
    await notificationModel.markAsRead(notificationId, userId);
    return { success: true };
};

// ─── markAllAsRead ────────────────────────────────────────────────────────────
const markAllAsRead = async (userId) => {
    await notificationModel.markAllAsRead(userId);
    return { success: true };
};

module.exports = {
    createNotification,
    getNotifications,
    getUnread,
    markOneAsRead,
    markAllAsRead,
};
