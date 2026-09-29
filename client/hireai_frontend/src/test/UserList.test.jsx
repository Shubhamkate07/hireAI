import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import axios from 'axios';
import UserList from './UserList';

vi.mock('axios');

describe('UserList', () => {
  test('displays users after successful API call', async () => {
    axios.get.mockResolvedValue({
      data: [{ id: 1, name: 'Alice', email: 'alice@test.com' }]
    });

    render(<UserList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    const userName = await screen.findByText('Alice');
    expect(userName).toBeInTheDocument();
  });
});
