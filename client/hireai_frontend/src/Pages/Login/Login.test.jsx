import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe } from 'vitest-axe';
import Login from './Login';
import authReducer from '../../store/slices/authSlice';
import * as authService from '../../services/authService';

// Mock authService
vi.mock('../../services/authService', () => ({
    loginUser: vi.fn(),
    getCurrentUser: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderLoginComponent = () => {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        </Provider>
    );
};

describe('Login Page — Full Mutation & Accessibility Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders email and password inputs with a Login submit button', () => {
        renderLoginComponent();

        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    });

    test('shows validation errors when submitted with empty fields', async () => {
        const user = userEvent.setup();
        renderLoginComponent();

        await user.click(screen.getByRole('button', { name: /^login$/i }));

        expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    test('dispatches login mutation and redirects to /dashboard on success', async () => {
        const user = userEvent.setup();

        vi.mocked(authService.loginUser).mockResolvedValueOnce({
            data: {
                success: true,
                user: { id: 1, name: 'Candidate User', email: 'candidate@hireai.dev', role: 'candidate' },
            },
        });

        renderLoginComponent();

        await user.type(screen.getByLabelText(/email address/i), 'candidate@hireai.dev');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /^login$/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    test('shows error banner alert on login failure mutation', async () => {
        const user = userEvent.setup();

        vi.mocked(authService.loginUser).mockRejectedValueOnce({
            response: {
                data: {
                    success: false,
                    message: 'Invalid credentials',
                },
            },
        });

        renderLoginComponent();

        await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpass');
        await user.click(screen.getByRole('button', { name: /^login$/i }));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    test('has no accessibility violations (axe-core audit)', async () => {
        const { container } = renderLoginComponent();
        const results = await axe(container);

        expect(results).toHaveNoViolations();
    });
});
