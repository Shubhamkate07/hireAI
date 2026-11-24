import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProtectedRoute from './ProtectedRoute';
import authReducer from '../store/slices/authSlice';

const createMockStore = (initialAuthState) => {
    return configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState: {
            auth: {
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                ...initialAuthState,
            },
        },
    });
};

const renderProtectedRoute = (store, requiredRole) => {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route path="/dashboard" element={<div>Dashboard Page</div>} />
                    <Route element={<ProtectedRoute requiredRole={requiredRole} />}>
                        <Route path="/protected" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};

describe('ProtectedRoute Component', () => {
    test('shows loading spinner when checking session state', () => {
        const store = createMockStore({ loading: true });
        renderProtectedRoute(store);

        expect(screen.getByRole('status', { name: /loading session/i })).toBeInTheDocument();
    });

    test('redirects to /login when user is not authenticated', () => {
        const store = createMockStore({ isAuthenticated: false, loading: false });
        renderProtectedRoute(store);

        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).toBeNull();
    });

    test('redirects non-admin user away from admin-only route to /dashboard', () => {
        const store = createMockStore({
            isAuthenticated: true,
            loading: false,
            user: { name: 'Candidate', role: 'candidate' },
        });
        renderProtectedRoute(store, 'admin');

        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).toBeNull();
    });

    test('renders protected outlet content when user is authorized', () => {
        const store = createMockStore({
            isAuthenticated: true,
            loading: false,
            user: { name: 'Admin', role: 'admin' },
        });
        renderProtectedRoute(store, 'admin');

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
