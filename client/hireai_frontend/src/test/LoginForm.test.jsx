import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  test('renders all fields (email, password) and a submit button', () => {
    render(<LoginForm onSubmit={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('shows email validation error when submit clicked with empty email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => {}} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  test('shows password error when password is under 8 characters', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), '12345');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  test('calls the onSubmit callback with correct data on valid submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'securepassword123',
    });
  });
});
