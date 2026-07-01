import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    loginUser as loginApi,
    registerUser as registerApi,
    logoutUser as logoutApi,
    getCurrentUser
} from '../../services/authService';

const initialState = {
    user: null,
    loading: true,       // true initially so ProtectedRoute waits for checkAuth
    isAuthenticated: false
};

// ─── Async Thunks ────────────────────────────────────────────────────────────

// Called once on app mount to restore session from httpOnly cookie
export const checkAuth = createAsyncThunk(
    'auth/checkAuth',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getCurrentUser();
            return response.data.data;        // the user object from /auth/me
        } catch {
            return rejectWithValue(null);     // not authenticated — not an error
        }
    }
);

// Login
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await loginApi(credentials);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Login failed' });
        }
    }
);

// Register
export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await registerApi(userData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Registration failed. Please try again.' });
        }
    }
);

// Logout
export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            await logoutApi();
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Logout failed' });
        }
    }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({

    name: 'auth',
    initialState,

    reducers: {
        // Used by authEvent.js to force-clear user on 401 from any protected API
        clearUser(state) {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
        }
    },

    extraReducers: (builder) => {
        builder

            // ── checkAuth (session restore on page refresh) ──
            .addCase(checkAuth.pending, (state) => {
                state.loading = true;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = !!action.payload;
            })
            .addCase(checkAuth.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.isAuthenticated = false;
            })

            // ── loginUser ──
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                // server returns { data: { user: {...} } } — adjust if your shape differs
                state.user = action.payload?.data?.user ?? action.payload;
                state.isAuthenticated = true;
            })
            .addCase(loginUser.rejected, (state) => {
                state.loading = false;
                state.isAuthenticated = false;
            })

            // ── registerUser ──
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(registerUser.fulfilled, (state) => {
                state.loading = false;
                // Registration doesn't log the user in — they go to /login next
            })
            .addCase(registerUser.rejected, (state) => {
                state.loading = false;
            })

            // ── logoutUser ──
            .addCase(logoutUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.loading = false;
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(logoutUser.rejected, (state) => {
                // Even if server call fails, clear local state
                state.loading = false;
                state.user = null;
                state.isAuthenticated = false;
            });
    }
});

export const { clearUser } = authSlice.actions;

export default authSlice.reducer;