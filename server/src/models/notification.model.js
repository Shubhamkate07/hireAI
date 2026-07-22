/**
 * ============================================================
 * notification.model.js — Raw SQL for the notifications table
 * ============================================================
 *
 * Table structure (run in init.sql before using this):
 *   id             INT PRIMARY KEY AUTO_INCREMENT
 *   user_id        INT NOT NULL → who receives the notification
 *   type           VARCHAR(50)  → e.g. 'application_status_changed'
 *   title          VARCHAR(150) → short headline shown in the UI
 *   message        TEXT         → longer description
 *   is_read        BOOLEAN      → false = unread (shown as badge)
 *   reference_id   INT          → polymorphic: id of the related record
 *   reference_type VARCHAR(50)  → polymorphic: 'application' | 'job' | etc.
 *   created_at     TIMESTAMP
 *
 * WHAT IS A POLYMORPHIC REFERENCE?
 *   Instead of separate FK columns (application_id, job_id, assessment_id...),
 *   we use two generic columns:
 *     reference_id   = the id of any related record
 *     reference_type = the name of its table / resource type
 *   This lets one notifications table point to ANY entity without schema
 *   changes every time a new resource type is added.
 * ============================================================
 */

const pool = require('../config/database');

// ─── createNotification ───────────────────────────────────────────────────────
// Inserts one notification row.
// Called by notification.service.js (and in turn by recruiter.service.js).
const createNotification = async (
    userId,
    type,
    title,
    message,
    referenceId = null,
    referenceType = null
) => {
    const [result] = await pool.query(
        `INSERT INTO notifications
            (user_id, type, title, message, reference_id, reference_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, type, title, message, referenceId, referenceType]
    );

    return result.insertId;
};

// ─── findNotificationsByUser ──────────────────────────────────────────────────
// Returns all notifications for a user, newest first.
// Pass onlyUnread = true to get only the unread ones (used for badge count).
const findNotificationsByUser = async (userId, onlyUnread = false) => {
    let query = `
        SELECT *
        FROM notifications
        WHERE user_id = ?
    `;

    if (onlyUnread) {
        query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.query(query, [userId]);

    return rows;
};

// ─── markAsRead ───────────────────────────────────────────────────────────────
// Marks a single notification as read.
// The userId check is a security guard — users can only mark their OWN notifications.
const markAsRead = async (notificationId, userId) => {
    await pool.query(
        `UPDATE notifications
         SET is_read = true
         WHERE id = ? AND user_id = ?`,
        [notificationId, userId]
    );
};

// ─── markAllAsRead ────────────────────────────────────────────────────────────
// Marks every unread notification for this user as read in one query.
// Much more efficient than calling markAsRead in a loop.
const markAllAsRead = async (userId) => {
    await pool.query(
        `UPDATE notifications
         SET is_read = true
         WHERE user_id = ? AND is_read = false`,
        [userId]
    );
};

module.exports = {
    createNotification,
    findNotificationsByUser,
    markAsRead,
    markAllAsRead,
};
