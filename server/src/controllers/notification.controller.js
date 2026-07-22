/**
 * ============================================================
 * notification.controller.js — HTTP layer for Notifications
 * ============================================================
 */

const notificationService = require('../services/notification.service');
const ApiResponse         = require('../utils/ApiResponse');

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns all notifications for the logged-in user, newest first.
// Optional query param: ?unread=true  — return only unread ones.
const getNotifications = async (req, res, next) => {
    try {
        const onlyUnread = req.query.unread === 'true';

        const notifications = await notificationService.getNotifications(
            req.user.id,
            onlyUnread
        );

        return res.status(200).json(
            new ApiResponse(200, notifications, 'Notifications fetched successfully')
        );
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// Marks a single notification as read.
// The service enforces that you can only mark YOUR OWN notifications.
const markOneRead = async (req, res, next) => {
    try {
        const result = await notificationService.markOneAsRead(
            req.params.id,   // which notification
            req.user.id      // security: only the owner can mark it read
        );

        return res.status(200).json(
            new ApiResponse(200, result, 'Notification marked as read')
        );
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// Marks ALL unread notifications for the current user as read in one query.
const markAllRead = async (req, res, next) => {
    try {
        const result = await notificationService.markAllAsRead(req.user.id);

        return res.status(200).json(
            new ApiResponse(200, result, 'All notifications marked as read')
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getNotifications,
    markOneRead,
    markAllRead,
};
