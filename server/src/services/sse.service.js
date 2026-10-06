/**
 * ============================================================
 * sse.service.js — In-memory SSE client registry
 * ============================================================
 *
 * Registry Maps:
 *   1. clients           : userId (string) → Express res object
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
        clients.set(String(userId), res);
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
    if (userId) {
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
 * Push an event to a specific user.
 */
const sendToUser = (userId, event) => {
    const clientRes = clients.get(String(userId));
    if (clientRes) {
        clientRes.write(`data: ${JSON.stringify(event)}\n\n`);
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

/**
 * Debugging utilities
 */
const getConnectedCount = () => clients.size;
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
