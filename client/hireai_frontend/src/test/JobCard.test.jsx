import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import JobCard from '../Components/JobCard';

describe('JobCard Component', () => {
  const mockJob = {
    id: 1,
    title: 'Senior Frontend Engineer',
    company: 'TechCorp Solutions',
    location: 'Remote',
    job_type: 'remote',
    status: 'open',
    salary_min: 120000,
    salary_max: 150000,
    description: 'We are looking for a skilled Frontend Engineer with React experience.',
    created_at: '2026-07-01T00:00:00.000Z',
  };

  test('renders title, company, and formatted salary', () => {
    render(<JobCard job={mockJob} />);

    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Solutions')).toBeInTheDocument();
    expect(screen.getByText(/1,20,000/i)).toBeInTheDocument();
  });

  test('renders Apply button when handler exists and calls handler on click', async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    render(<JobCard job={mockJob} onApply={handleApply} />);

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeInTheDocument();

    await user.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(mockJob);
  });
});
