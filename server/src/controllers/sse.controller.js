/**
 * ============================================================
 * sse.controller.js — HTTP handler for SSE connection endpoint
 * ============================================================
 *
 * GET /api/sse/connect  (protected by authMiddleware)
 *
 * WHAT HAPPENS STEP BY STEP:
 *   1. Client (browser EventSource) sends GET /api/sse/connect
 *   2. We set headers: Content-Type: text/event-stream, no caching.
 *      res.flushHeaders() sends the 200 + headers immediately —
 *      this is what "opens" the persistent connection.
 *   3. We send an immediate heartbeat so the browser confirms the
 *      connection is alive.
 *   4. We register this res in sseService.addClient(userId, res).
 *   5. We send any existing unread notifications (so new tab loads
 *      don't miss things that happened while they were away).
 *   6. req.on('close', ...) fires when the browser closes the tab
 *      or the network drops. We call removeClient to clean the Map.
 *
 * WHY res.flushHeaders()?
 *   Without it, Node/Express buffers the response and nothing is sent
 *   until the buffer fills. The browser's EventSource would just hang.
 *   flushHeaders() forces the headers (and the 200 OK) to be sent
 *   immediately, opening the stream.
 *
 * WHY Connection: keep-alive?
 *   HTTP/1.1 would normally close the connection after each response.
 *   keep-alive tells both the browser and any proxy (Nginx) to hold
 *   the TCP connection open for the lifetime of the event stream.
 * ============================================================
 */

const sseService          = require('../services/sse.service');
const notificationService = require('../services/notification.service');

const connect = async (req, res) => {
    const userId = req.user.id;

    // ── Step 1: Set SSE headers ────────────────────────────────────────────────
    // text/event-stream is the MIME type the browser's EventSource expects.
    // Without it, the browser won't treat this as an event stream.
    res.setHeader('Content-Type', 'text/event-stream');

    // No caching — every event must be delivered fresh, never from cache.
    res.setHeader('Cache-Control', 'no-cache');

    // Keep the TCP connection alive for the life of the stream.
    res.setHeader('Connection', 'keep-alive');

    // Send headers immediately. This is what "opens" the persistent connection.
    // Before this line, nothing has been sent to the browser.
    res.flushHeaders();

    // ── Step 2: Immediate heartbeat ────────────────────────────────────────────
    // Send a connected event right away. This confirms to the browser that the
    // connection is live and lets the client know to update its UI state.
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // ── Step 3: Register this client ──────────────────────────────────────────
    // Now other services can push events to this user via sendToUser(userId, ...).
    sseService.addClient(userId, res);

    // ── Step 4: Deliver unread notifications already in the DB ────────────────
    // If the user opens a new tab, they shouldn't miss notifications that were
    // created while they were offline. We deliver them as an 'initial' batch.
    try {
        const unreadNotifications = await notificationService.getUnread(userId);
        if (unreadNotifications.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'initial', notifications: unreadNotifications })}\n\n`);
        }
    } catch (err) {
        console.error('[SSE] Error loading initial notifications:', err.message);
    }

    // ── Step 5: Cleanup on disconnect ─────────────────────────────────────────
    // req 'close' fires when:
    //   - Browser closes the tab
    //   - User navigates away (EventSource gets garbage collected)
    //   - Network drops
    //
    // If we DON'T remove the client, the Map holds a dead res object forever.
    // That's a memory leak AND future sendToUser calls will throw trying to
    // write to a closed socket.
    req.on('close', () => {
        sseService.removeClient(userId);
        console.log(`[SSE] Client disconnected. userId=${userId}. Active connections: ${sseService.getConnectedCount()}`);
    });
};

module.exports = { connect };
