import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiClientError,
  Group,
  GroupMember,
  PairBalance,
  Settlement,
  SplitType,
  User,
  UserBalanceSummary,
  apiClient,
} from '../lib/api';
import {
  ExpenseFormDraft,
  ExpenseParticipantDraft,
  validateExpenseFormDraft,
} from '../lib/expenseForm';
import { useAuth } from '../auth/AuthContext';

const DEFAULT_ROLE = 'ADMIN' as const;

function toCurrency(amount: number): string {
  return (amount / 100).toFixed(2);
}

function errorToText(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.payload?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error occurred.';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Booting dashboard...');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [balances, setBalances] = useState<PairBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<UserBalanceSummary | null>(null);

  const [selectedUserId, setSelectedUserId] = useState(session?.userId ?? '');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberId, setNewMemberId] = useState('');

  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [expenseDescription, setExpenseDescription] = useState('Dinner');
  const [expenseTotal, setExpenseTotal] = useState('1200');

  const [settleFromUserId, setSettleFromUserId] = useState('');
  const [settleToUserId, setSettleToUserId] = useState('');
  const [settleAmount, setSettleAmount] = useState('100');
  const [settleKey, setSettleKey] = useState('');

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const expenseParticipants = useMemo<ExpenseParticipantDraft[]>(() => {
    return members.map((member) => ({
      userId: member.userId,
      amount: splitType === 'EXACT' ? '0' : undefined,
      percentage: splitType === 'PERCENTAGE' ? '0' : undefined,
    }));
  }, [members, splitType]);

  const [participantDrafts, setParticipantDrafts] = useState<ExpenseParticipantDraft[]>([]);

  useEffect(() => {
    setParticipantDrafts(expenseParticipants);
  }, [expenseParticipants]);

  useEffect(() => {
    if (session?.userId) {
      setSelectedUserId(session.userId);
    }
  }, [session?.userId]);

  const auth = useMemo(() => ({ token: session?.token, role: DEFAULT_ROLE }), [session?.token]);

  const loadGroupDetails = async (groupId: string, userIdForSummary?: string) => {
    const summaryUserId = userIdForSummary ?? selectedUserId;
    const [membersRes, balancesRes, settlementsRes] = await Promise.all([
      apiClient.fetchGroupMembers(groupId, auth),
      apiClient.fetchGroupBalances(groupId, auth),
      apiClient.fetchGroupSettlements(groupId, auth),
    ]);

    setMembers(membersRes);
    setBalances(balancesRes);
    setSettlements(settlementsRes);

    if (summaryUserId) {
      const summaryRes = await apiClient.fetchUserBalanceSummary(groupId, summaryUserId, auth);
      setSummary(summaryRes);
    }
  };

  const refreshAll = async () => {
    const [health, usersRes, groupsRes] = await Promise.all([
      apiClient.fetchHealth(),
      apiClient.fetchUsers(auth),
      apiClient.fetchGroups(auth),
    ]);

    setStatus(`Connected to ${health.service} (${health.version})`);
    setUsers(usersRes);
    setGroups(groupsRes);

    const initialUserId = selectedUserId || session?.userId || usersRes[0]?.id || '';
    if (initialUserId !== selectedUserId) {
      setSelectedUserId(initialUserId);
    }

    const initialGroupId = selectedGroupId || groupsRes[0]?.id || '';
    if (initialGroupId !== selectedGroupId) {
      setSelectedGroupId(initialGroupId);
    }

    if (initialGroupId) {
      await loadGroupDetails(initialGroupId, initialUserId);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorBanner(null);
      try {
        await refreshAll();
      } catch (error) {
        setStatus('Backend is not reachable or returned an error.');
        setErrorBanner(errorToText(error));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    const run = async () => {
      try {
        await loadGroupDetails(selectedGroupId);
      } catch (error) {
        setErrorBanner(errorToText(error));
      }
    };

    void run();
  }, [selectedGroupId, selectedUserId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!newGroupName.trim()) {
      setErrorBanner('Group name is required.');
      return;
    }
    if (!auth.token) {
      setErrorBanner('Select current user before creating a group.');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    try {
      const group = await apiClient.createGroup(newGroupName.trim(), auth);
      setGroups((previous) => [group, ...previous]);
      setSelectedGroupId(group.id);
      setNewGroupName('');
      await loadGroupDetails(group.id);
    } catch (error) {
      setErrorBanner(errorToText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroupId) {
      setErrorBanner('Select a group first.');
      return;
    }
    if (!newMemberId) {
      setErrorBanner('Select a user to add.');
      return;
    }
    if (!auth.token) {
      setErrorBanner('Select current user before adding members.');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    try {
      await apiClient.addGroupMember(selectedGroupId, newMemberId, 'MEMBER', auth);
      setNewMemberId('');
      await loadGroupDetails(selectedGroupId);
    } catch (error) {
      setErrorBanner(errorToText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroupId) {
      setErrorBanner('Select a group first.');
      return;
    }
    if (!auth.token) {
      setErrorBanner('Select current user before creating expenses.');
      return;
    }

    const draft: ExpenseFormDraft = {
      paidByUserId: settleToUserId || selectedUserId,
      totalAmount: expenseTotal,
      currency: 'USD',
      description: expenseDescription,
      splitType,
      participants: participantDrafts,
    };

    const validation = validateExpenseFormDraft(draft);
    if (!validation.ok || !validation.payload) {
      setErrorBanner(validation.message ?? 'Invalid expense form');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    try {
      await apiClient.createExpense(selectedGroupId, validation.payload, auth);
      await loadGroupDetails(selectedGroupId);
    } catch (error) {
      setErrorBanner(errorToText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSettlement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGroupId) {
      setErrorBanner('Select a group first.');
      return;
    }
    if (!auth.token) {
      setErrorBanner('Select current user before recording settlements.');
      return;
    }

    const parsedAmount = Number(settleAmount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setErrorBanner('Settlement amount must be a positive integer (minor units).');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    try {
      await apiClient.createSettlement(
        selectedGroupId,
        {
          fromUserId: settleFromUserId || selectedUserId,
          toUserId: settleToUserId || selectedUserId,
          amount: parsedAmount,
          idempotencyKey: settleKey || undefined,
        },
        auth,
      );
      await loadGroupDetails(selectedGroupId);
    } catch (error) {
      setErrorBanner(errorToText(error));
    } finally {
      setSaving(false);
    }
  };

  const updateParticipantField = (
    userId: string,
    field: 'amount' | 'percentage',
    value: string,
  ) => {
    setParticipantDrafts((previous) =>
      previous.map((participant) =>
        participant.userId === userId
          ? {
              ...participant,
              [field]: value,
            }
          : participant,
      ),
    );
  };

  return (
    <main className="app-shell" aria-busy={loading || saving}>
      <section className="hero">
        <div className="hero-row">
          <div>
            <h1>Smart Expense Sharing</h1>
            <p>Authenticated dashboard workspace.</p>
            <strong className="status">{status}</strong>
          </div>
          <div className="session-box">
            <p>Signed in as</p>
            <strong>{session?.name ?? 'Unknown User'}</strong>
            <span>{session?.email}</span>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </section>

      {errorBanner && <section className="alert">{errorBanner}</section>}

      <section className="grid">
        <article className="panel">
          <h2>Context</h2>
          <label htmlFor="current-user">Current User (session token)</label>
          <select
            id="current-user"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>

          <label htmlFor="current-group">Selected Group</label>
          <select
            id="current-group"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
          >
            <option value="">Select group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <p className="muted">
            Group: <strong>{selectedGroup?.name ?? 'N/A'}</strong>
          </p>
        </article>

        <article className="panel">
          <h2>Group Management</h2>
          <form onSubmit={handleCreateGroup} className="stack">
            <label htmlFor="new-group">Create Group</label>
            <input
              id="new-group"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Weekend Trip"
            />
            <button disabled={saving || loading} type="submit">Create Group</button>
          </form>

          <form onSubmit={handleAddMember} className="stack">
            <label htmlFor="new-member">Add Member</label>
            <select
              id="new-member"
              value={newMemberId}
              onChange={(event) => setNewMemberId(event.target.value)}
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button disabled={saving || loading || !selectedGroupId} type="submit">Add Member</button>
          </form>
        </article>

        <article className="panel panel-wide">
          <h2>Expense Creation</h2>
          <form onSubmit={handleCreateExpense} className="stack">
            <label htmlFor="expense-description">Description</label>
            <input
              id="expense-description"
              value={expenseDescription}
              onChange={(event) => setExpenseDescription(event.target.value)}
            />

            <label htmlFor="expense-total">Total Amount (minor units)</label>
            <input
              id="expense-total"
              inputMode="numeric"
              value={expenseTotal}
              onChange={(event) => setExpenseTotal(event.target.value)}
            />

            <label htmlFor="expense-split-type">Split Type</label>
            <select
              id="expense-split-type"
              value={splitType}
              onChange={(event) => setSplitType(event.target.value as SplitType)}
            >
              <option value="EQUAL">EQUAL</option>
              <option value="EXACT">EXACT</option>
              <option value="PERCENTAGE">PERCENTAGE</option>
            </select>

            <label htmlFor="expense-payer">Paid By</label>
            <select
              id="expense-payer"
              value={settleToUserId || selectedUserId}
              onChange={(event) => setSettleToUserId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.user.name}
                </option>
              ))}
            </select>

            <div className="participant-grid">
              {participantDrafts.map((participant) => {
                const member = members.find((item) => item.userId === participant.userId);
                return (
                  <div className="participant-row" key={participant.userId}>
                    <span>{member?.user.name ?? participant.userId}</span>
                    {splitType === 'EXACT' && (
                      <input
                        aria-label={`amount-${participant.userId}`}
                        inputMode="numeric"
                        value={participant.amount ?? ''}
                        onChange={(event) =>
                          updateParticipantField(participant.userId, 'amount', event.target.value)
                        }
                      />
                    )}
                    {splitType === 'PERCENTAGE' && (
                      <input
                        aria-label={`percentage-${participant.userId}`}
                        inputMode="decimal"
                        value={participant.percentage ?? ''}
                        onChange={(event) =>
                          updateParticipantField(participant.userId, 'percentage', event.target.value)
                        }
                      />
                    )}
                    {splitType === 'EQUAL' && <span className="muted">auto</span>}
                  </div>
                );
              })}
            </div>

            <button disabled={saving || loading || !selectedGroupId} type="submit">
              Create Expense
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Balances</h2>
          <ul className="list">
            {balances.map((balance) => (
              <li key={`${balance.debtorUserId}-${balance.creditorUserId}`}>
                <strong>{balance.debtorUserId.slice(0, 6)}</strong> owes{' '}
                <strong>{balance.creditorUserId.slice(0, 6)}</strong> ${toCurrency(balance.netAmount)}
              </li>
            ))}
            {balances.length === 0 && <li>No balances yet.</li>}
          </ul>

          {summary && (
            <div className="summary">
              <p>Total Owed: ${toCurrency(summary.totalOwed)}</p>
              <p>Total Receivable: ${toCurrency(summary.totalReceivable)}</p>
              <p>Net Balance: ${toCurrency(summary.netBalance)}</p>
            </div>
          )}
        </article>

        <article className="panel panel-wide">
          <h2>Settlement Recording</h2>
          <form onSubmit={handleCreateSettlement} className="stack">
            <label htmlFor="settle-from">From User</label>
            <select
              id="settle-from"
              value={settleFromUserId || selectedUserId}
              onChange={(event) => setSettleFromUserId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.user.name}
                </option>
              ))}
            </select>

            <label htmlFor="settle-to">To User</label>
            <select
              id="settle-to"
              value={settleToUserId || selectedUserId}
              onChange={(event) => setSettleToUserId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.user.name}
                </option>
              ))}
            </select>

            <label htmlFor="settle-amount">Amount (minor units)</label>
            <input
              id="settle-amount"
              inputMode="numeric"
              value={settleAmount}
              onChange={(event) => setSettleAmount(event.target.value)}
            />

            <label htmlFor="settle-key">Idempotency Key (optional)</label>
            <input
              id="settle-key"
              value={settleKey}
              onChange={(event) => setSettleKey(event.target.value)}
              placeholder="optional-retry-safe-key"
            />

            <button disabled={saving || loading || !selectedGroupId} type="submit">
              Record Settlement
            </button>
          </form>

          <ul className="list compact">
            {settlements.map((settlement) => (
              <li key={settlement.id}>
                {settlement.fromUser.name} paid {settlement.toUser.name} ${toCurrency(settlement.amount)}
              </li>
            ))}
            {settlements.length === 0 && <li>No settlements yet.</li>}
          </ul>
        </article>
      </section>
    </main>
  );
}
