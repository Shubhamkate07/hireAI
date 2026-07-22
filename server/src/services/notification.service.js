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
 * ============================================================
 */

const notificationModel = require('../models/notification.model');

// ─── createNotification ───────────────────────────────────────────────────────
// Thin wrapper — delegates straight to the model.
// This is what recruiter.service calls in a fire-and-forget pattern.
const createNotification = async (
    userId,
    type,
    title,
    message,
    referenceId = null,
    referenceType = null
) => {
    return notificationModel.createNotification(
        userId,
        type,
        title,
        message,
        referenceId,
        referenceType
    );
};

// ─── getNotifications ─────────────────────────────────────────────────────────
// Returns all (or only unread) notifications for the logged-in user.
const getNotifications = async (userId, onlyUnread = false) => {
    return notificationModel.findNotificationsByUser(userId, onlyUnread);
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
    markOneAsRead,
    markAllAsRead,
};
