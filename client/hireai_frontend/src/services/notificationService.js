/**
 * ============================================================
 * notificationService.js — API calls for notifications
 * ============================================================
 *
 * Centralises all HTTP calls related to notifications.
 * Other components import from here, not directly from api.js.
 * This makes it easy to change API endpoints in one place.
 * ============================================================
 */

import api from './api';

/**
 * Fetch all notifications for the current user.
 * Pass { params: { unread: true } } to get only unread ones.
 */
export const fetchNotifications = async (onlyUnread = false) => {
    const params = onlyUnread ? { unread: 'true' } : {};
    const { data } = await api.get('/notifications', { params });
    // data.data is the array of notifications (ApiResponse wrapper)
    return data.data;
};

/**
 * Mark a single notification as read.
 * Called optimistically — see NotificationBell for rollback logic.
 */
export const markNotificationRead = async (notificationId) => {
    const { data } = await api.patch(`/notifications/${notificationId}/read`);
    return data.data;
};

/**
 * Mark ALL notifications as read in one API call.
 */
export const markAllNotificationsRead = async () => {
    const { data } = await api.patch('/notifications/read-all');
    return data.data;
};
