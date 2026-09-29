import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter';

describe('Counter', () => {
  test('renders with initial count of 0', () => {
    render(<Counter />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('increments count when increment button clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('does not go below 0 when decrement clicked at 0', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole('button', { name: /decrement/i }));
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
