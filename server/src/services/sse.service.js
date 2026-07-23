/**
 * ============================================================
 * sse.service.js — In-memory SSE client registry
 * ============================================================
 *
 * HOW IT WORKS:
 *   We keep a Map: userId (string) → Express res object.
 *   When a candidate opens HireAI, their browser connects to
 *   GET /api/sse/connect. The controller hands us their `res`
 *   and we store it here.
 *
 *   When a recruiter changes an application status, the notification
 *   service calls sendToUser(candidateId, event). We look up their
 *   `res` and write the SSE wire format directly to it.
 *
 * PRODUCTION LIMITATION (important for interviews):
 *   This only works in a SINGLE-PROCESS Node setup.
 *   In a cluster (multiple processes), process A might hold the
 *   client's connection while process B creates the notification.
 *   Process A's Map doesn't know about process B's notification.
 *   The production fix is Redis Pub/Sub — every process subscribes;
 *   whichever process holds the connection forwards the event.
 *
 * SSE WIRE FORMAT (the entire protocol):
 *   data: {"type":"new_notification","notification":{...}}\n\n
 *   Two newlines (\n\n) terminate each event. That's it.
 * ============================================================
 */

// userId (string) → Express res object
const clients = new Map();

/**
 * Register a client when they connect to /api/sse/connect.
 * We convert userId to string so both number and string IDs work.
 */
const addClient = (userId, res) => {
    clients.set(String(userId), res);
};

/**
 * Remove a client when they disconnect (tab close, network drop, etc.).
 * Without this, the Map grows forever — a memory leak.
 */
const removeClient = (userId) => {
    clients.delete(String(userId));
};

/**
 * Push an event to a specific user.
 *
 * If the user isn't connected (no entry in Map), we do nothing —
 * that's fine. They'll pick up the notification via the initial
 * load next time they connect.
 *
 * The wire format is: data: <json string>\n\n
 * The double newline tells the browser's EventSource: "event complete".
 */
const sendToUser = (userId, event) => {
    const clientRes = clients.get(String(userId));
    if (clientRes) {
        clientRes.write(`data: ${JSON.stringify(event)}\n\n`);
    }
};

/**
 * Utility — useful for debugging in development.
 * Returns the count of currently connected clients.
 */
const getConnectedCount = () => clients.size;

module.exports = { addClient, removeClient, sendToUser, getConnectedCount };
