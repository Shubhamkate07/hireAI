/**
 * ============================================================
 * sse.service.js — In-memory SSE client registry
 * ============================================================
 *
 * Registry Maps:
 *   1. clients           : userId (string) → Set of Express res objects
 *   2. assessmentClients : assessmentId (string) → Set of Express res objects
 * ============================================================
 */

const clients = new Map();
const assessmentClients = new Map();

/**
 * Register a client when they connect to /api/sse/connect.
 * Optional assessmentId query param registers them as an assessment watcher.
 */
const addClient = (userId, res, assessmentId = null) => {
    if (userId) {
        const id = String(userId);
        if (!clients.has(id)) {
            clients.set(id, new Set());
        }
        clients.get(id).add(res);
    }

    if (assessmentId) {
        const key = String(assessmentId);
        if (!assessmentClients.has(key)) {
            assessmentClients.set(key, new Set());
        }
        assessmentClients.get(key).add(res);
    }
};

/**
 * Remove a client when they disconnect (tab close, network drop, etc.).
 * Cleans up both user clients Map and assessment clients Set to prevent memory leaks.
 */
const removeClient = (userId, res = null, assessmentId = null) => {
    if (userId && res) {
        const id = String(userId);
        const set = clients.get(id);
        if (set) {
            set.delete(res);
            if (set.size === 0) {
                clients.delete(id);
            }
        }
    } else if (res) {
        for (const [id, set] of clients.entries()) {
            if (set.has(res)) {
                set.delete(res);
                if (set.size === 0) {
                    clients.delete(id);
                }
            }
        }
    } else if (userId) {
        clients.delete(String(userId));
    }

    if (assessmentId && res) {
        const key = String(assessmentId);
        const set = assessmentClients.get(key);
        if (set) {
            set.delete(res);
            if (set.size === 0) {
                assessmentClients.delete(key);
            }
        }
    } else if (res) {
        // Fallback: search all assessment sets to remove closed res socket
        for (const [key, set] of assessmentClients.entries()) {
            if (set.has(res)) {
                set.delete(res);
                if (set.size === 0) {
                    assessmentClients.delete(key);
                }
            }
        }
    }
};

/**
 * Push an event to a specific user (across all open tabs/connections).
 */
const sendToUser = (userId, event) => {
    const set = clients.get(String(userId));
    if (set && set.size > 0) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        set.forEach((clientRes) => {
            try {
                clientRes.write(payload);
            } catch (err) {
                console.error(`[SSE] Failed writing to user socket ${userId}:`, err.message);
            }
        });
    }
};

/**
 * Push real-time leaderboard updates to all active watchers of an assessment.
 */
const sendToAssessmentWatchers = (assessmentId, event) => {
    const key = String(assessmentId);
    const watchers = assessmentClients.get(key);
    if (watchers && watchers.size > 0) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        watchers.forEach((res) => {
            try {
                res.write(payload);
            } catch (err) {
                console.error(`[SSE] Failed writing to watcher socket for assessment ${assessmentId}:`, err.message);
            }
        });
    }
};

// Periodic keep-alive ping (every 25 seconds) to prevent proxy/firewall timeouts
const pingInterval = setInterval(() => {
    const comment = ': ping\n\n';
    for (const set of clients.values()) {
        set.forEach((res) => {
            try {
                res.write(comment);
            } catch {}
        });
    }
    for (const set of assessmentClients.values()) {
        set.forEach((res) => {
            try {
                res.write(comment);
            } catch {}
        });
    }
}, 25000);

if (pingInterval.unref) {
    pingInterval.unref(); // don't block process exit in tests
}

/**
 * Debugging utilities
 */
const getConnectedCount = () => {
    let total = 0;
    for (const set of clients.values()) {
        total += set.size;
    }
    return total;
};

const getAssessmentWatchersCount = (assessmentId) => {
    const set = assessmentClients.get(String(assessmentId));
    return set ? set.size : 0;
};

module.exports = {
    addClient,
    removeClient,
    sendToUser,
    sendToAssessmentWatchers,
    getConnectedCount,
    getAssessmentWatchersCount,
};
