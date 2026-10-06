import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeaderboardPage from './LeaderboardPage';
import * as analyticsService from '../../services/analyticsService';
import { AuthContext } from '../../context/AuthContext';

// Helper: create isolated QueryClient
const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity }
  }
});

// Helper: render LeaderboardPage with required Providers & Route Params
const renderLeaderboard = (assessmentId = '101', userValue = null) => {
  const queryClient = createTestClient();
  const authVal = {
    user: userValue,
    loading: false,
    isAuthenticated: !!userValue,
  };

  return render(
    <AuthContext.Provider value={authVal}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/assessments/${assessmentId}/leaderboard`]}>
          <Routes>
            <Route path="/assessments/:assessmentId/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

// Mock analytics service
vi.mock('../../services/analyticsService', () => ({
  getAssessmentLeaderboard: vi.fn(),
}));

describe('LeaderboardPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders ranked leaderboard table with gold/silver/bronze badges and highlights current user', async () => {
    const mockLeaderboardData = {
      assessment_title: 'React Senior Frontend Assessment',
      leaderboard: [
        {
          rank: 1,
          candidate_id: 'c1',
          candidate_name: 'Alice Cooper',
          score: 95,
          max_score: 100,
          percentage: 95,
          submitted_at: '2026-09-30T10:00:00Z',
        },
        {
          rank: 2,
          candidate_id: 'c2',
          candidate_name: 'Bob Marley (You)',
          score: 88,
          max_score: 100,
          percentage: 88,
          submitted_at: '2026-09-30T10:30:00Z',
        },
        {
          rank: 3,
          candidate_id: 'c3',
          candidate_name: 'Charlie Brown',
          score: 75,
          max_score: 100,
          percentage: 75,
          submitted_at: '2026-09-30T11:00:00Z',
        },
      ],
    };

    analyticsService.getAssessmentLeaderboard.mockResolvedValue(mockLeaderboardData);

    const currentUser = { id: 'c2', email: 'bob@example.com' };
    renderLeaderboard('101', currentUser);

    // Verify Title & Table rendering
    expect(await screen.findByText('React Senior Frontend Assessment')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();

    // Verify Candidates
    expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

    // Verify Rank Badges
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();

    // Verify Current User Highlight
    expect(screen.getByTestId('current-user-row')).toBeInTheDocument();
    expect(screen.getByTestId('you-badge')).toBeInTheDocument();
  });

  test('renders empty state when leaderboard has no entries', async () => {
    analyticsService.getAssessmentLeaderboard.mockResolvedValue({
      assessment_title: 'Fullstack System Design',
      leaderboard: [],
    });

    renderLeaderboard('102', { id: 'c1' });

    // Confirm empty state renders
    expect(await screen.findByTestId('leaderboard-empty')).toBeInTheDocument();
    expect(screen.getByText('No submissions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Be the first to take this assessment and claim the #1 spot on the leaderboard!')
    ).toBeInTheDocument();
  });
});
