import userEvent from '@testing-library/user-event';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { clearSession, writeSession } from './auth/session';

const now = new Date().toISOString();

const baseUser = {
  createdAt: now,
  updatedAt: now,
};

const users = {
  alice: {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    phones: [{ id: 'phone-alice-1', number: '+1-111-111', label: 'mobile', verified: true, createdAt: now }],
    ...baseUser,
  },
  bob: {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob',
    phones: [{ id: 'phone-bob-1', number: '+1-222-222', label: 'personal', verified: true, createdAt: now }],
    ...baseUser,
  },
  charlie: {
    id: 'user-3',
    email: 'charlie@example.com',
    name: 'Charlie',
    phones: [{ id: 'phone-charlie-1', number: '+1-333-333', label: 'work', verified: false, createdAt: now }],
    ...baseUser,
  },
};

const initialGroup = {
  id: 'group-existing',
  name: 'Existing Group',
  createdByUserId: users.alice.id,
  createdAt: now,
  updatedAt: now,
};

const buildMember = (user: (typeof users)[keyof typeof users], role: 'ADMIN' | 'MEMBER') => ({
  id: `${user.id}-member`,
  groupId: 'group-1',
  userId: user.id,
  role,
  joinedAt: now,
  isActive: true,
  user,
});

function createAppFetchMock() {
  let groups = [initialGroup];
  let groupMembers: Record<string, Array<ReturnType<typeof buildMember>>> = {
    [initialGroup.id]: [buildMember(users.alice, 'ADMIN')],
  };
  let expensesByGroup: Record<string, Array<any>> = {
    [initialGroup.id]: [],
  };
  let settlementsByGroup: Record<string, Array<any>> = {
    [initialGroup.id]: [],
  };
  let balancesByGroup: Record<string, Array<any>> = {
    [initialGroup.id]: [],
  };
  let balanceSummaryByGroup: Record<string, any> = {
    [initialGroup.id]: {
      userId: users.alice.id,
      totalOwed: 0,
      totalReceivable: 0,
      netBalance: 0,
      owes: [],
      owedBy: [],
    },
  };

  const json = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status });

  const updateSummaryFromBalances = (groupId: string) => {
    const balances = balancesByGroup[groupId] ?? [];
    const oweTotals: Record<string, number> = {};
    const owedTotals: Record<string, number> = {};

    balances.forEach((balance) => {
      oweTotals[balance.debtorUserId] = (oweTotals[balance.debtorUserId] ?? 0) + balance.netAmount;
      owedTotals[balance.creditorUserId] = (owedTotals[balance.creditorUserId] ?? 0) + balance.netAmount;
    });

    const aliceOwes = Object.entries(oweTotals)
      .filter(([userId]) => userId === users.alice.id)
      .map(([userId, amount]) => ({ userId, amount }));
    const aliceOwed = Object.entries(owedTotals)
      .filter(([userId]) => userId === users.alice.id)
      .map(([userId, amount]) => ({ userId, amount }));

    balanceSummaryByGroup[groupId] = {
      userId: users.alice.id,
      totalOwed: aliceOwes.reduce((sum, entry) => sum + entry.amount, 0),
      totalReceivable: aliceOwed.reduce((sum, entry) => sum + entry.amount, 0),
      netBalance:
        aliceOwed.reduce((sum, entry) => sum + entry.amount, 0) -
        aliceOwes.reduce((sum, entry) => sum + entry.amount, 0),
      owes: aliceOwes,
      owedBy: aliceOwed,
    };
  };

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/health')) {
      return json({ service: 'backend', version: 'v1', timestamp: now });
    }

    if (url.endsWith('/auth/login')) {
      return json({
        token: 'token-1',
        user: { id: users.alice.id, email: users.alice.email, name: users.alice.name },
      });
    }

    if (url.endsWith('/users')) {
      return json([users.alice, users.bob, users.charlie]);
    }

    if (url.endsWith('/groups') && method === 'GET') {
      return json(groups);
    }

    if (url.endsWith('/groups') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { name: string };
      const newGroup = {
        id: 'group-1',
        name: body.name,
        createdByUserId: users.alice.id,
        createdAt: now,
        updatedAt: now,
      };
      groups = [newGroup, ...groups];
      groupMembers[newGroup.id] = [buildMember(users.alice, 'ADMIN')];
      expensesByGroup[newGroup.id] = [];
      settlementsByGroup[newGroup.id] = [];
      balancesByGroup[newGroup.id] = [];
      updateSummaryFromBalances(newGroup.id);
      return json(newGroup, 201);
    }

    const groupMatch = url.match(/\/groups\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
    if (!groupMatch) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }), {
        status: 404,
      });
    }

    const groupId = groupMatch[1];
    const tail = url.slice(url.indexOf(`/groups/${groupId}`) + `/groups/${groupId}`.length);

    if (tail === '/members' && method === 'GET') {
      return json(groupMembers[groupId] ?? []);
    }

    if (tail === '/members' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { userId: string; phoneId: string; role: 'ADMIN' | 'MEMBER' };
      const user = body.userId === users.bob.id ? users.bob : users.charlie;
      const selectedPhone = user.phones.find((phone) => phone.id === body.phoneId) ?? null;
      const member = {
        ...buildMember(user, body.role),
        selectedPhoneId: body.phoneId,
        selectedPhone,
      };
      groupMembers[groupId] = [...(groupMembers[groupId] ?? []), member];
      return json(member, 201);
    }

    if (tail === '/expenses' && method === 'GET') {
      return json(expensesByGroup[groupId] ?? []);
    }

    if (tail === '/expenses' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { paidByUserId: string; totalAmount: number; description: string; splitType: string };
      const expense = {
        id: 'expense-1',
        groupId,
        paidByUserId: body.paidByUserId,
        totalAmount: body.totalAmount,
        currency: 'USD',
        description: body.description,
        splitType: body.splitType,
        createdAt: now,
        updatedAt: now,
        paidBy: body.paidByUserId === users.alice.id ? users.alice : users.bob,
        shares: [],
      };
      expensesByGroup[groupId] = [expense, ...(expensesByGroup[groupId] ?? [])];
      balancesByGroup[groupId] = [{ debtorUserId: users.bob.id, creditorUserId: users.alice.id, netAmount: body.totalAmount }];
      updateSummaryFromBalances(groupId);
      return json(expense, 201);
    }

    if (tail === '/balances' && method === 'GET') {
      return json(balancesByGroup[groupId] ?? []);
    }

    if (tail.startsWith('/balances/users/') && method === 'GET') {
      return json(balanceSummaryByGroup[groupId] ?? {
        userId: users.alice.id,
        totalOwed: 0,
        totalReceivable: 0,
        netBalance: 0,
        owes: [],
        owedBy: [],
      });
    }

    if (tail === '/settlements' && method === 'GET') {
      return json(settlementsByGroup[groupId] ?? []);
    }

    if (tail === '/settlements' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { fromUserId: string; toUserId: string; amount: number };
      const settlement = {
        id: 'settle-1',
        groupId,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        amount: body.amount,
        createdAt: now,
        fromUser: body.fromUserId === users.bob.id ? users.bob : users.alice,
        toUser: body.toUserId === users.alice.id ? users.alice : users.bob,
      };
      settlementsByGroup[groupId] = [settlement, ...(settlementsByGroup[groupId] ?? [])];
      balancesByGroup[groupId] = [];
      updateSummaryFromBalances(groupId);
      return json(settlement, 201);
    }

    return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'not found' } }), {
      status: 404,
    });
  });
}

describe('Phase 14 frontend flows', () => {
  beforeEach(() => {
    clearSession();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects authenticated and unauthenticated users through protected routes', async () => {
    const fetchMock = createAppFetchMock();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    cleanup();

    writeSession({ token: 'token-1', userId: users.alice.id, email: users.alice.email, name: users.alice.name });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument());
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockRestore();
    clearSession();
  });

  it('supports the main dashboard-to-settlement flow and renders named balances', async () => {
    const user = userEvent.setup();
    const fetchMock = createAppFetchMock();

    writeSession({ token: 'token-1', userId: users.alice.id, email: users.alice.email, name: users.alice.name });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /➕ Create Group/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Create Group/i })).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Group name'), 'Trip Planning');
    await user.click(screen.getByRole('button', { name: /^Create Group$/i }));
    await waitFor(() => expect(screen.getByText(/Group created successfully/i)).toBeInTheDocument());

    await waitFor(() => expect(screen.getByText('Trip Planning', { selector: 'h2' })).toBeInTheDocument());

    await user.selectOptions(screen.getAllByRole('combobox')[0], users.bob.id);
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'phone-bob-1');
    await user.click(screen.getByRole('button', { name: /Add Member/i }));
    await waitFor(() => expect(screen.getByText(/Member added successfully/i)).toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /Expenses/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Add Expense/i })).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/Description/i), 'Dinner');
    await user.type(screen.getByPlaceholderText('Amount'), '1375');
    await user.selectOptions(screen.getAllByRole('combobox')[1], users.alice.id);
    await user.click(screen.getByRole('button', { name: /Create Expense/i }));
    await waitFor(() => expect(screen.getByText(/Expense created successfully/i)).toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /Balances/i }));
    await user.click(screen.getByRole('button', { name: /Detailed/i }));
    await waitFor(() => expect(screen.getByText(/All Balances/i)).toBeInTheDocument());
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Alice', { selector: 'td.creditor-cell' })).toBeInTheDocument();
    expect(screen.getByText('$1375')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Settlements/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Record Settlement/i })).toBeInTheDocument());

    await user.selectOptions(screen.getAllByRole('combobox')[1], users.bob.id);
    await user.selectOptions(screen.getAllByRole('combobox')[2], users.alice.id);
    await user.type(screen.getByPlaceholderText('Amount'), '1375');
    await user.click(screen.getByRole('button', { name: /Record Settlement/i }));
    await waitFor(() => expect(screen.getByText(/Settlement recorded successfully/i)).toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /Balances/i }));
    await user.click(screen.getByRole('button', { name: /Detailed/i }));
    await waitFor(() => expect(screen.getByText(/No balances yet/i)).toBeInTheDocument());

    fetchMock.mockRestore();
    clearSession();
  });
});