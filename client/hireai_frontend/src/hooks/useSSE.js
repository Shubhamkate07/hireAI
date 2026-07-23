/**
 * ============================================================
 * useSSE.js — Custom hook for consuming a Server-Sent Events stream
 * ============================================================
 *
 * WHAT IS EventSource?
 *   EventSource is a browser built-in API (no library needed).
 *   It opens a persistent GET connection to a URL and automatically
 *   parses the text/event-stream protocol for you.
 *
 * WHAT DOES THIS HOOK DO?
 *   - Opens an EventSource connection when the component mounts
 *   - Appends each incoming event to the `events` state array
 *   - Closes the connection when the component unmounts (cleanup)
 *   - Re-opens the connection if the URL changes
 *
 * AUTOMATIC RECONNECTION:
 *   EventSource handles reconnection automatically.
 *   If the connection drops, it waits ~3 seconds and retries.
 *   Our onerror handler only closes permanently if the server sends
 *   an error that shouldn't be retried (e.g. 401 Unauthorized).
 *   For transient errors (network blip), just let EventSource retry.
 *
 * WHY return () => eventSource.close() IN useEffect?
 *   When the component unmounts (user navigates away, React re-renders),
 *   this cleanup function runs. Without it:
 *   - The HTTP connection stays open on the server
 *   - The server's Map still holds the dead res object
 *   - If the component remounts, a SECOND EventSource opens on top
 *     of the first — you'd receive every event twice
 *   - Memory leak on both client and server
 *
 * USAGE:
 *   const events = useSSE('http://localhost:5000/api/sse/connect');
 *   // events is an array of parsed JSON objects, newest first
 * ============================================================
 */

import { useState, useEffect } from 'react';

const useSSE = (url) => {
    // `events` holds all SSE payloads received since mount.
    // We prepend (newest first) so the latest event is always at index 0.
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!url) return; // Guard: don't open a stream if no URL is provided

        // ── Open the SSE connection ────────────────────────────────────────────
        // { withCredentials: true } sends cookies with the request.
        // This is required because our /api/sse/connect route is protected
        // by JWT stored in an httpOnly cookie. Without this, auth fails.
        const eventSource = new EventSource(url, { withCredentials: true });

        // ── Handle incoming events ─────────────────────────────────────────────
        // onmessage fires for every "data: ..." event from the server.
        // e.data is a string — we parse it back to the object the server sent.
        eventSource.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                // Prepend to state so latest event is first in the array
                setEvents((prev) => [parsed, ...prev]);
            } catch {
                console.warn('[useSSE] Failed to parse event data:', e.data);
            }
        };

        // ── Handle errors ──────────────────────────────────────────────────────
        // onerror fires on connection failure.
        // EventSource.CLOSED = 2 means it was intentionally closed.
        // For other errors (network blip), EventSource retries automatically —
        // so we DON'T close it here; we let the browser handle retry.
        eventSource.onerror = (err) => {
            console.warn('[useSSE] Connection error:', err);
            // Only close if the browser has already decided to close it
            if (eventSource.readyState === EventSource.CLOSED) {
                eventSource.close();
            }
        };

        // ── Cleanup: close the stream when the component unmounts ──────────────
        // This is the CRITICAL cleanup. Without it, closing the tab would leave
        // a ghost connection on the server, leaking memory and file descriptors.
        return () => {
            eventSource.close();
        };

    }, [url]); // Re-run only if the URL changes

    return events;
};

export default useSSE;
