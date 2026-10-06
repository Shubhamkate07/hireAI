import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import JobsListPage from './JobsListPage';
import * as jobService from '../../services/jobService';

// Helper: create isolated QueryClient per test to avoid state pollution
const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity }
  }
});

// Helper: render component wrapped in QueryClientProvider and MemoryRouter
const renderWithProviders = (ui) => {
  const queryClient = createTestClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Mock the jobService module
vi.mock('../../services/jobService', () => ({
  getJobs: vi.fn(),
}));

describe('JobsListPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Exercise 1: Async loading -> Success state ────────────────────────────
  test('shows loading skeleton then job list on success', async () => {
    // Mock API returning a delayed promise to verify loading skeleton state
    let resolveApi;
    const pendingPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    jobService.getJobs.mockImplementation(() => pendingPromise);

    renderWithProviders(<JobsListPage />);

    // 1. Initial assertion: loading skeleton is rendered
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    // 2. Resolve the API response
    resolveApi({
      jobs: [
        {
          id: 1,
          title: 'Senior React Dev',
          company: 'Augle AI',
          status: 'open',
          job_type: 'remote',
          location: 'Remote',
          created_at: '2026-09-30T10:00:00Z',
        },
      ],
      pagination: { total: 1, page: 1, totalPages: 1 },
    });

    // 3. Success state assertion: loading disappears and job title appears
    expect(await screen.findByText('Senior React Dev')).toBeInTheDocument();
    expect(screen.getByText('Augle AI')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
  });

  // ── Exercise 2: Error state ────────────────────────────────────────────────
  test('shows error message when API request fails', async () => {
    jobService.getJobs.mockRejectedValue({
      response: { data: { message: 'Failed to retrieve jobs from server' } },
    });

    renderWithProviders(<JobsListPage />);

    // Confirm error header & details render
    expect(await screen.findByText('Failed to load jobs')).toBeInTheDocument();
    expect(screen.getByText('Failed to retrieve jobs from server')).toBeInTheDocument();
  });

  // ── Exercise 3: Empty state ────────────────────────────────────────────────
  test('shows empty state when no jobs are returned', async () => {
    jobService.getJobs.mockResolvedValue({
      jobs: [],
      pagination: { total: 0, page: 1, totalPages: 1 },
    });

    renderWithProviders(<JobsListPage />);

    // Confirm empty state title renders
    expect(await screen.findByText('No jobs found')).toBeInTheDocument();
    expect(screen.getByText('There are no jobs posted yet. Check back later.')).toBeInTheDocument();
  });
});
