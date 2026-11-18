/**
 * ============================================================
 * api.js — Shared Axios instance + silent token refresh
 * ============================================================
 *
 * HOW OUR AUTH TOKENS WORK
 * ────────────────────────
 *   accessToken  → short-lived (15 min). Sent on every API call (httpOnly cookie).
 *   refreshToken → long-lived (7 days). Only used to get a NEW access token.
 *
 *   Why two tokens? If an access token leaks, it's useless in 15 minutes.
 *   The refresh token is checked against the DB, so the server can revoke it
 *   (logout deletes it) — something you can't do with a plain JWT.
 *
 * WHAT THE INTERCEPTOR BELOW DOES
 * ───────────────────────────────
 *   1. Any request fails with 401 (access token expired / missing)
 *   2. We call POST /auth/refresh-token  → server sets a fresh accessToken cookie
 *   3. We replay the original request    → user never notices anything
 *   4. If refresh ALSO fails (refresh token expired/revoked) → log the user out
 *
 * WHY "SINGLE-FLIGHT" (refreshPromise)?
 *   A dashboard may fire 5 requests at once. When the token expires, all 5 get
 *   401 at the same moment. Without a guard we'd call /refresh-token 5 times.
 *   Instead, the first 401 starts the refresh and stores the promise; the other
 *   4 simply `await` that same promise, then retry.
 * ============================================================
 */
import axios from "axios";
import { triggerLogout } from "./authEvent";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // send httpOnly cookies with every request
    // NOTE: Do NOT set a default Content-Type here.
    // Axios sets it automatically per request:
    //   • Plain object body  → application/json
    //   • FormData body      → multipart/form-data; boundary=<generated>
    // Hardcoding "application/json" here would strip the boundary string
    // from FormData requests, breaking multipart parsing on the server.
});

// Routes where a 401 must NOT trigger a refresh:
//   login/register → 401 means "wrong password", not "token expired"
//   refresh-token  → refreshing the refresh call would loop forever
//   logout         → we're leaving anyway
// NOTE: /auth/me is deliberately NOT here. On page reload after 15 min the
// access cookie is gone, /auth/me 401s, and we want to refresh + restore the session.
const NO_REFRESH_ROUTES = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh-token",
    "/auth/logout",
];

let refreshPromise = null;

/**
 * Ask the server for a new access token. Concurrent callers share one request.
 * Exported so non-axios code (EventSource / SSE) can reuse it.
 * Rejects (and logs the user out) if the refresh token is invalid/expired.
 */
export const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = api
            .post("/auth/refresh-token")
            .catch((err) => {
                triggerLogout();
                throw err;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url || "";

        const shouldRefresh =
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry && // only retry each request once
            !NO_REFRESH_ROUTES.some((route) => url.includes(route));

        if (!shouldRefresh) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            await refreshSession();          // get a new accessToken cookie
            return api(originalRequest);     // replay the failed request
        } catch {
            // Refresh failed → user already logged out by refreshSession().
            // Reject with the ORIGINAL error so callers see the real 401.
            return Promise.reject(error);
        }
    }
);

export default api;
