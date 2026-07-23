/**
 * ============================================================
 * NotificationBell.jsx — Real-time notification bell component
 * ============================================================
 *
 * FEATURES:
 *   1. Fetches existing notifications on mount (via useQuery)
 *   2. Connects to SSE stream — new notifications appear instantly
 *      without a page refresh
 *   3. Shows unread count badge on the bell icon
 *   4. Clicking the bell opens/closes a dropdown
 *   5. Optimistic mark-as-read — UI updates immediately on click,
 *      rolls back to previous state if the API call fails
 *   6. Mark all as read button
 *
 * OPTIMISTIC UI PATTERN (the key concept):
 *   Normal flow:    click → wait for API → update UI
 *   Optimistic flow: click → update UI immediately →
 *                    wait for API → if error → rollback UI
 *
 *   Why? Users expect instant feedback. A 200ms "flash of unread"
 *   while the API is in flight feels broken. Optimistic UI removes
 *   that lag entirely at the cost of a small rollback risk.
 *
 * SSE INTEGRATION:
 *   useSSE returns an array of raw SSE event objects.
 *   We watch that array with useEffect. When a new event arrives,
 *   we inspect its `type` field and update the notifications state:
 *     - 'connected'     → no-op (just confirms stream is live)
 *     - 'initial'       → bulk-load unread notifications from server
 *     - 'new_notification' → prepend the new notification to the list
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useSSE from '../hooks/useSSE';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../services/notificationService';
import './NotificationBell.css';

// ─── SSE endpoint ─────────────────────────────────────────────────────────────
// In development: http://localhost:5000/api/sse/connect
// In production: /api/sse/connect (same origin, Nginx proxies it)
const SSE_URL = `${import.meta.env.VITE_API_URL.replace('/api', '')}/api/sse/connect`;

const NotificationBell = () => {
    // ── Local state ───────────────────────────────────────────────────────────
    const [isOpen, setIsOpen] = useState(false);

    // `notifications` is our local copy of the notifications list.
    // Separate from React Query cache so we can mutate it optimistically
    // without going through the cache invalidation cycle.
    const [notifications, setNotifications] = useState([]);

    // Track SSE connection status for a small UI indicator
    const [sseConnected, setSseConnected] = useState(false);

    // Ref to the dropdown div — used to detect clicks outside (close on outside click)
    const dropdownRef = useRef(null);

    const queryClient = useQueryClient();

    // ── Fetch notifications on mount (React Query) ────────────────────────────
    // staleTime: 30s — don't refetch if we just got the data.
    // The SSE stream keeps us up-to-date in real time, so polling is unnecessary.
    const { data: fetchedNotifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => fetchNotifications(),
        staleTime: 30_000,
        // NOTE: onSuccess was removed in React Query v5.
        // We sync the fetched data into local state via the useEffect below.
    });

    // Sync fetched data into local state when query first resolves
    useEffect(() => {
        if (fetchedNotifications) {
            setNotifications(fetchedNotifications);
        }
    }, [fetchedNotifications]);

    // ── SSE: connect and listen for real-time events ──────────────────────────
    // useSSE returns an array of all events received since mount.
    // We watch the array length — every time it grows, the latest event is [0].
    const sseEvents = useSSE(SSE_URL);

    useEffect(() => {
        if (sseEvents.length === 0) return;

        // The latest event is always at index 0 (we prepend in useSSE)
        const latestEvent = sseEvents[0];

        if (latestEvent.type === 'connected') {
            // Stream confirmed alive
            setSseConnected(true);
        }

        if (latestEvent.type === 'initial') {
            // Server sent a batch of unread notifications on connection.
            // Merge them with existing local state (avoid duplicates by id).
            setNotifications((prev) => {
                const existingIds = new Set(prev.map((n) => n.id));
                const newOnes = latestEvent.notifications.filter(
                    (n) => !existingIds.has(n.id)
                );
                return [...newOnes, ...prev];
            });
        }

        if (latestEvent.type === 'new_notification') {
            // A brand-new notification was just pushed from the server.
            // Prepend it to the top of the list.
            setNotifications((prev) => {
                // Guard: don't add duplicates (edge case on reconnect)
                if (prev.some((n) => n.id === latestEvent.notification.id)) {
                    return prev;
                }
                return [latestEvent.notification, ...prev];
            });
        }
    }, [sseEvents]); // Runs every time the events array changes (new event arrives)

    // ── Close dropdown on outside click ───────────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Derived values ─────────────────────────────────────────────────────────
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    // ── OPTIMISTIC mark-as-read ────────────────────────────────────────────────
    //
    // STEP BY STEP:
    //   1. Save the current notifications array as `previous` (snapshot)
    //   2. Immediately update UI: set is_read = true for this notification
    //   3. Call the API in the background
    //   4a. API succeeds → nothing to do, UI is already correct
    //   4b. API fails → restore `previous` (rollback)
    //
    // WHY SAVE `previous` BEFORE the setNotifications call?
    //   Because after setNotifications runs, the old value is gone.
    //   We need the snapshot BEFORE the mutation so we have something to
    //   roll back to.
    const markAsRead = async (notificationId) => {
        // Step 1: Snapshot — "what was the state before this click?"
        const previous = notifications;

        // Step 2: Optimistic update — change the UI immediately
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notificationId ? { ...n, is_read: true } : n
            )
        );

        // Step 3: API call in the background
        try {
            await markNotificationRead(notificationId);
            // Step 4a: Success — invalidate React Query cache to keep it in sync
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err) {
            // Step 4b: Failure — ROLLBACK. Restore the previous state.
            console.error('[NotificationBell] markAsRead failed, rolling back:', err);
            setNotifications(previous);
        }
    };

    // ── Mark all read ──────────────────────────────────────────────────────────
    const markAllRead = async () => {
        const previous = notifications;

        // Optimistic: mark all as read in UI immediately
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

        try {
            await markAllNotificationsRead();
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err) {
            console.error('[NotificationBell] markAllRead failed, rolling back:', err);
            setNotifications(previous);
        }
    };

    // ── Format timestamp ───────────────────────────────────────────────────────
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="notif-bell-wrapper" ref={dropdownRef}>

            {/* ── Bell button ────────────────────────────────────────────── */}
            <button
                id="notification-bell-btn"
                className="notif-bell-btn"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                title="Notifications"
            >
                {/* Bell SVG icon */}
                <svg
                    className="notif-bell-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* Red badge — only shown when there are unread notifications */}
                {unreadCount > 0 && (
                    <span className="notif-badge" aria-hidden="true">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Green dot — SSE connection alive indicator */}
                {sseConnected && <span className="notif-sse-dot" title="Real-time connected" />}
            </button>

            {/* ── Dropdown panel ─────────────────────────────────────────── */}
            {isOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Notifications">

                    {/* Header */}
                    <div className="notif-header">
                        <h3 className="notif-title">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                id="mark-all-read-btn"
                                className="notif-mark-all-btn"
                                onClick={markAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="notif-list">
                        {isLoading && (
                            <div className="notif-empty">
                                <div className="notif-loading-spinner" />
                                <span>Loading…</span>
                            </div>
                        )}

                        {!isLoading && notifications.length === 0 && (
                            <div className="notif-empty">
                                <span className="notif-empty-icon">🔔</span>
                                <p>You're all caught up!</p>
                            </div>
                        )}

                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                id={`notification-item-${n.id}`}
                                className={`notif-item ${n.is_read ? 'notif-item--read' : 'notif-item--unread'}`}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && !n.is_read && markAsRead(n.id)}
                            >
                                {/* Unread indicator dot */}
                                <div className="notif-item-dot-col">
                                    {!n.is_read && <span className="notif-item-dot" />}
                                </div>

                                <div className="notif-item-content">
                                    <p className="notif-item-title">{n.title}</p>
                                    <p className="notif-item-msg">{n.message}</p>
                                    <span className="notif-item-time">
                                        {formatTime(n.created_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
