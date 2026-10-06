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
    const assessmentId = req.query.assessmentId || null;

    // ── Step 1: Set SSE headers ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // ── Step 2: Immediate heartbeat ────────────────────────────────────────────
    res.write(`data: ${JSON.stringify({ type: 'connected', userId, assessmentId })}\n\n`);

    // ── Step 3: Register this client ──────────────────────────────────────────
    sseService.addClient(userId, res, assessmentId);

    // ── Step 4: Deliver unread notifications already in the DB ────────────────
    try {
        const unreadNotifications = await notificationService.getUnread(userId);
        if (unreadNotifications.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'initial', notifications: unreadNotifications })}\n\n`);
        }
    } catch (err) {
        console.error('[SSE] Error loading initial notifications:', err.message);
    }

    // ── Step 5: Cleanup on disconnect ─────────────────────────────────────────
    req.on('close', () => {
        sseService.removeClient(userId, res, assessmentId);
        console.log(`[SSE] Client disconnected. userId=${userId}, assessmentId=${assessmentId}. Active connections: ${sseService.getConnectedCount()}`);
    });
};

module.exports = { connect };
