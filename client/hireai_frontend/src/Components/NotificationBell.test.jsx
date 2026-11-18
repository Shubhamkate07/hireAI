import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import NotificationBell from './NotificationBell';
import * as notificationService from '../services/notificationService';

// Mock useSSE hook
vi.mock('../hooks/useSSE', () => ({
    default: () => [],
}));

// Mock notificationService
vi.mock('../services/notificationService', () => ({
    fetchNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
}));

const renderNotificationBell = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <NotificationBell />
        </QueryClientProvider>
    );
};

describe('NotificationBell Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders notification bell button without crashing', () => {
        vi.mocked(notificationService.fetchNotifications).mockResolvedValueOnce([]);
        renderNotificationBell();

        expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    test('opens dropdown panel on click and displays empty state', async () => {
        const user = userEvent.setup();
        vi.mocked(notificationService.fetchNotifications).mockResolvedValueOnce([]);

        renderNotificationBell();

        await user.click(screen.getByRole('button', { name: /notifications/i }));

        expect(screen.getByRole('dialog', { name: /notifications/i })).toBeInTheDocument();
        expect(screen.getByText(/you're all caught up!/i)).toBeInTheDocument();
    });

    test('renders list of unread notifications and badge count', async () => {
        const user = userEvent.setup();
        const mockNotifs = [
            { id: 1, title: 'New Application', message: 'John applied for React Developer', is_read: false, created_at: new Date().toISOString() },
        ];

        vi.mocked(notificationService.fetchNotifications).mockResolvedValueOnce(mockNotifs);

        renderNotificationBell();

        expect(await screen.findByText('1')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /notifications/i }));

        expect(screen.getByText('New Application')).toBeInTheDocument();
        expect(screen.getByText('John applied for React Developer')).toBeInTheDocument();
    });

    test('has no accessibility violations on bell button', async () => {
        vi.mocked(notificationService.fetchNotifications).mockResolvedValueOnce([]);
        const { container } = renderNotificationBell();
        const results = await axe(container);

        expect(results).toHaveNoViolations();
    });
});
