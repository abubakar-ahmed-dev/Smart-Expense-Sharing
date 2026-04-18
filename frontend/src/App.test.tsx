import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { clearSession, writeSession } from './auth/session';

const mockUsers = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob',
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockGroups = [
  {
    id: 'group-1',
    name: 'Trip',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockMembers = [
  {
    id: 'member-1',
    groupId: 'group-1',
    userId: 'user-1',
    role: 'ADMIN',
    joinedAt: new Date().toISOString(),
    isActive: true,
    user: mockUsers[0],
  },
  {
    id: 'member-2',
    groupId: 'group-1',
    userId: 'user-2',
    role: 'MEMBER',
    joinedAt: new Date().toISOString(),
    isActive: true,
    user: mockUsers[1],
  },
];

describe('App', () => {
  it('redirects unauthenticated users to login page', async () => {
    clearSession();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('renders dashboard with fetched data', async () => {
    writeSession({
      token: 'token-1',
      userId: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      isVerified: true,
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/health')) {
        return new Response(
          JSON.stringify({ success: true, data: { service: 'backend', version: 'v1', timestamp: new Date().toISOString() } }),
          { status: 200 },
        );
      }

      if (url.endsWith('/users')) {
        return new Response(JSON.stringify({ success: true, data: mockUsers }), { status: 200 });
      }

      if (url.endsWith('/groups')) {
        return new Response(JSON.stringify({ success: true, data: mockGroups }), { status: 200 });
      }

      if (url.endsWith('/members')) {
        return new Response(JSON.stringify({ success: true, data: mockMembers }), { status: 200 });
      }

      if (url.includes('/balances/users/')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              userId: 'user-1',
              totalOwed: 0,
              totalReceivable: 500,
              netBalance: 500,
              owes: [],
              owedBy: [{ userId: 'user-2', amount: 500 }],
            },
          }),
          { status: 200 },
        );
      }

      if (url.endsWith('/balances')) {
        return new Response(
          JSON.stringify({ success: true, data: [{ debtorUserId: 'user-2', creditorUserId: 'user-1', netAmount: 500 }] }),
          { status: 200 },
        );
      }

      if (url.endsWith('/settlements')) {
        if (init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 'settle-1',
                groupId: 'group-1',
                fromUserId: 'user-2',
                toUserId: 'user-1',
                amount: 500,
                createdAt: new Date().toISOString(),
                fromUser: mockUsers[1],
                toUser: mockUsers[0],
              },
            }),
            { status: 201 },
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      }

      if (url.endsWith('/expenses')) {
        if (init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 'expense-1',
                groupId: 'group-1',
                paidByUserId: 'user-1',
                totalAmount: 1000,
                currency: 'USD',
                description: 'Dinner',
                splitType: 'EQUAL',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paidBy: mockUsers[0],
                shares: [],
              },
            }),
            { status: 201 },
          );
        }
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }), {
        status: 404,
      });
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Smart Expense Sharing/i)).toBeInTheDocument();
      expect(screen.getByText(/Connected to backend/i)).toBeInTheDocument();
      expect(screen.getByText(/Group Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Expense Creation/i)).toBeInTheDocument();
      expect(screen.getByText(/Settlement Recording/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockRestore();
    clearSession();
  });
});
