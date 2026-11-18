/**
 * Tests the silent-refresh interceptor in services/api.js.
 *
 * Instead of a real server we replace axios's "adapter" (the part that
 * actually sends HTTP) with a fake function, so we control every response.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/authEvent', () => ({ triggerLogout: vi.fn() }));

import api from '../services/api';
import { triggerLogout } from '../services/authEvent';

// Build a fake axios error with a given status
const httpError = (config, status) =>
    Object.assign(new Error(`HTTP ${status}`), {
        config,
        response: { status, data: {}, config },
        isAxiosError: true,
    });

const ok = (config, data = {}) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

describe('api.js refresh interceptor', () => {
    let calls;
    beforeEach(() => {
        calls = [];
        vi.mocked(triggerLogout).mockClear();
    });

    it('refreshes once and retries the original request on 401', async () => {
        let tokenValid = false;
        api.defaults.adapter = async (config) => {
            calls.push(config.url);
            if (config.url === '/auth/refresh-token') { tokenValid = true; return ok(config); }
            if (!tokenValid) throw httpError(config, 401);
            return ok(config, { job: 1 });
        };

        const res = await api.get('/jobs/1');

        expect(res.data).toEqual({ job: 1 });
        expect(calls).toEqual(['/jobs/1', '/auth/refresh-token', '/jobs/1']);
        expect(triggerLogout).not.toHaveBeenCalled();
    });

    it('shares ONE refresh call between parallel 401s', async () => {
        let tokenValid = false;
        api.defaults.adapter = async (config) => {
            calls.push(config.url);
            if (config.url === '/auth/refresh-token') {
                await new Promise((r) => setTimeout(r, 10));
                tokenValid = true;
                return ok(config);
            }
            if (!tokenValid) throw httpError(config, 401);
            return ok(config);
        };

        await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

        expect(calls.filter((u) => u === '/auth/refresh-token')).toHaveLength(1);
    });

    it('logs out when the refresh token is also invalid', async () => {
        api.defaults.adapter = async (config) => {
            calls.push(config.url);
            throw httpError(config, 401);
        };

        await expect(api.get('/jobs/1')).rejects.toMatchObject({ response: { status: 401 } });
        expect(calls).toEqual(['/jobs/1', '/auth/refresh-token']);
        expect(triggerLogout).toHaveBeenCalledTimes(1);
    });

    it('does NOT refresh on a failed login (wrong password)', async () => {
        api.defaults.adapter = async (config) => {
            calls.push(config.url);
            throw httpError(config, 401);
        };

        await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
        expect(calls).toEqual(['/auth/login']);
    });
});
