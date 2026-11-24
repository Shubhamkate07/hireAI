/**
 * ============================================================
 * authedEventSource.js — EventSource that survives token expiry
 * ============================================================
 *
 * THE PROBLEM
 *   EventSource (SSE) is a browser API, not axios — so our axios refresh
 *   interceptor never sees its errors. If the stream drops (server restart,
 *   network blip) and the browser reconnects after the 15-min access token
 *   expired, the server answers 401. Per the SSE spec, any non-200 answer
 *   makes EventSource give up FOREVER (readyState = CLOSED).
 *
 * THE FIX
 *   When the browser gives up (CLOSED), call refreshSession() to get a fresh
 *   access cookie, then open a new EventSource. We allow only ONE such retry
 *   until the next successful open, so a real outage can't cause a tight loop.
 *
 * USAGE
 *   const close = openAuthedEventSource(url, { onOpen, onMessage, onError });
 *   // later (e.g. useEffect cleanup):
 *   close();
 * ============================================================
 */
import { refreshSession } from "./api";

export const openAuthedEventSource = (url, { onOpen, onMessage, onError } = {}) => {
    let eventSource = null;
    let stopped = false;           // set by close() — never reconnect after that
    let retriedSinceOpen = false;  // one refresh attempt per failure streak

    const connect = () => {
        if (stopped) return;

        // withCredentials: send our httpOnly auth cookies to the SSE endpoint
        eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onopen = (e) => {
            retriedSinceOpen = false; // healthy again → allow a future retry
            onOpen?.(e);
        };

        eventSource.onmessage = (e) => onMessage?.(e);

        eventSource.onerror = async (e) => {
            onError?.(e);

            // CONNECTING → transient error, the browser is already retrying itself.
            // CLOSED     → browser gave up (likely 401). That's our cue.
            if (eventSource.readyState !== EventSource.CLOSED) return;
            if (stopped || retriedSinceOpen) return;

            retriedSinceOpen = true;
            try {
                await refreshSession(); // new accessToken cookie
                connect();              // reopen with the fresh cookie
            } catch {
                // Refresh failed → refreshSession() already logged the user out.
            }
        };
    };

    connect();

    return () => {
        stopped = true;
        eventSource?.close();
    };
};
