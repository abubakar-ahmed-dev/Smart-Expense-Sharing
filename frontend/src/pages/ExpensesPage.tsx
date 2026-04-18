import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError, Group, GroupMember, Expense, SplitType, apiClient } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

function toCurrency(amount: number): string {
  return amount.toString();
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

export default function ExpensesPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGroupId = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});

  const auth = { token: session?.token };

  // Load groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const groupsData = await apiClient.fetchGroups(auth);
        setGroups(groupsData);
        if (!selectedGroupId && groupsData.length > 0) {
          setSearchParams({ groupId: groupsData[0].id });
        }
      } catch (err) {
        setError(errorToText(err));
      } finally {
        setLoading(false);
      }
    };

    void loadGroups();
  }, [session?.token]);

  // Load group members and expenses
  useEffect(() => {
    if (!selectedGroupId) return;

    const loadGroupData = async () => {
      try {
        setError(null);
        setSuccessMessage(null);
        const [membersData, expensesData] = await Promise.all([
          apiClient.fetchGroupMembers(selectedGroupId, auth),
          apiClient.fetchGroupExpenses(selectedGroupId, auth),
        ]);

        setMembers(membersData);
        setExpenses(expensesData);

        // Initialize split amounts
        const initialSplits: Record<string, string> = {};
        membersData.forEach((member) => {
          initialSplits[member.userId] = '0';
        });
        setSplitAmounts(initialSplits);

        if (!paidBy && membersData.length > 0) {
          setPaidBy(membersData[0].userId);
        }
      } catch (err) {
        setError(errorToText(err));
      }
    };

    void loadGroupData();
  }, [selectedGroupId, session?.token]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      setError('Select a group first.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!paidBy) {
      setError('Select who paid.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const participants = members.map((member) => ({
        userId: member.userId,
        amount: splitType === 'EXACT' ? Number(splitAmounts[member.userId] || 0) : undefined,
        percentage: splitType === 'PERCENTAGE' ? Number(splitAmounts[member.userId] || 0) : undefined,
      }));

      const newExpense = await apiClient.createExpense(
        selectedGroupId,
        {
          paidByUserId: paidBy,
          totalAmount: Number(amount),
          currency: 'USD',
          description: description.trim(),
          splitType,
          participants,
        },
        auth,
      );

      setExpenses((prev) => [newExpense, ...prev]);
      setDescription('');
      setAmount('');
      setSplitAmounts({});
      setSuccessMessage('Expense created successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setSaving(false);
    }
  };

  const currentGroup = groups.find((g) => g.id === selectedGroupId);

  if (loading) {
    return <div className="page-content">Loading expenses...</div>;
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <section className="page-section">
        <h2>Select Group</h2>
        <select
          value={selectedGroupId || ''}
          onChange={(e) => setSearchParams({ groupId: e.target.value })}
        >
          <option value="">Choose a group...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </section>

      {currentGroup && (
        <>
          {/* Create Expense Form */}
          <section className="page-section">
            <h2>Add Expense</h2>
            <form onSubmit={handleCreateExpense} className="expense-form">
              <div className="form-row">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (e.g., Dinner)"
                  disabled={saving}
                />
              </div>

              <div className="form-row">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  disabled={saving}
                />
              </div>

              <div className="form-row">
                <label>Paid by:</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} disabled={saving}>
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Split type:</label>
                <select value={splitType} onChange={(e) => setSplitType(e.target.value as SplitType)} disabled={saving}>
                  <option value="EQUAL">Equal Split</option>
                  <option value="EXACT">Exact Amounts</option>
                  <option value="PERCENTAGE">Percentages</option>
                </select>
              </div>

              {/* Split Distribution */}
              {splitType !== 'EQUAL' && (
                <div className="split-distribution">
                  <label>Split distribution:</label>
                  {members.map((member) => (
                    <div key={member.userId} className="split-input-row">
                      <span>{member.user.name}</span>
                      <input
                        type="number"
                        value={splitAmounts[member.userId] || ''}
                        onChange={(e) =>
                          setSplitAmounts((prev) => ({
                            ...prev,
                            [member.userId]: e.target.value,
                          }))
                        }
                        placeholder={splitType === 'EXACT' ? 'Amount' : 'Percentage'}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving || !currentGroup}>
                {saving ? 'Creating...' : 'Create Expense'}
              </button>
            </form>
          </section>

          {/* Expenses History */}
          <section className="page-section">
            <h2>Expense History</h2>
            {expenses.length === 0 ? (
              <p className="empty-state">No expenses yet. Create one to get started!</p>
            ) : (
              <div className="expenses-history">
                {expenses.map((expense) => (
                  <div key={expense.id} className="expense-entry">
                    <div className="expense-header">
                      <h4>{expense.description}</h4>
                      <span className="expense-amount">${toCurrency(expense.totalAmount)}</span>
                    </div>
                    <div className="expense-details">
                      <p className="text-muted">
                        Paid by <strong>{expense.paidBy.name}</strong> on{' '}
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-muted">
                        Split: {expense.splitType} • {expense.shares.length} members
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
