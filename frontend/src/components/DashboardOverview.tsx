import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClientError, Group, Expense, apiClient, UserBalanceSummary } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

interface OverviewData {
  totalOwed: number;
  totalToReceive: number;
  activeGroupsCount: number;
  recentExpenses: Expense[];
  activeGroups: Group[];
}

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

export function DashboardOverview() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [data, setData] = useState<OverviewData>({
    totalOwed: 0,
    totalToReceive: 0,
    activeGroupsCount: 0,
    recentExpenses: [],
    activeGroups: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = { token: session?.token };

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch groups
        const groups = await apiClient.fetchGroups(auth);
        setData((prev) => ({
          ...prev,
          activeGroupsCount: groups.length,
          activeGroups: groups.slice(0, 5), // Show top 5 groups
        }));

        // Calculate balances and expenses
        let totalOwed = 0;
        let totalToReceive = 0;
        const allExpenses: Expense[] = [];

        for (const group of groups) {
          try {
            const balances = await apiClient.fetchGroupBalances(group.id, auth);
            const expenses = await apiClient.fetchGroupExpenses(group.id, auth);

            // Aggregate expenses for recent activity
            allExpenses.push(...expenses);

            // Calculate personal balances
            balances.forEach((balance) => {
              if (balance.debtorUserId === session?.userId) {
                totalOwed += balance.netAmount;
              }
              if (balance.creditorUserId === session?.userId) {
                totalToReceive += balance.netAmount;
              }
            });
          } catch (err) {
            // Silently skip group if there's an error
            console.error(`Error loading group ${group.id}:`, err);
          }
        }

        // Sort expenses by date and get recent 10
        const recentExpenses = allExpenses
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        setData((prev) => ({
          ...prev,
          totalOwed,
          totalToReceive,
          recentExpenses,
        }));
      } catch (err) {
        setError(errorToText(err));
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [session?.userId, session?.token]);

  const hasData = data.activeGroupsCount > 0;

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">Loading dashboard...</div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="page-content">
        <section className="page-section empty-state-section">
          <h2>Welcome to Smart Expense Sharing! 👋</h2>
          <p>Get started by creating your first group.</p>
          <p className="text-muted">Groups let you manage shared expenses with friends and family.</p>
          <div className="empty-state-actions">
            <button className="btn-primary" onClick={() => navigate('/groups')}>
              Create Your First Group
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

      {/* Quick Actions */}
      <section className="page-section">
        <div className="quick-actions">
          <button className="action-btn action-btn-primary" onClick={() => navigate('/groups')}>
            ➕ Create Group
          </button>
          <button className="action-btn action-btn-secondary" onClick={() => navigate('/expenses')}>
            💰 Add Expense
          </button>
          <button className="action-btn action-btn-secondary" onClick={() => navigate('/settlements')}>
            ✅ Record Settlement
          </button>
        </div>
      </section>

      {/* Overview Cards */}
      <section className="page-section">
        <h2>Financial Overview</h2>
        <div className="overview-grid">
          <div className="overview-card">
            <h3>Total You Owe</h3>
            <div className="amount amount-negative">${toCurrency(data.totalOwed)}</div>
            <p className="card-info">Amount owed to others</p>
          </div>
          <div className="overview-card">
            <h3>Total Owed to You</h3>
            <div className="amount amount-positive">${toCurrency(data.totalToReceive)}</div>
            <p className="card-info">Amount others owe you</p>
          </div>
          <div className="overview-card">
            <h3>Net Balance</h3>
            <div
              className={`amount ${
                data.totalToReceive >= data.totalOwed ? 'amount-positive' : 'amount-negative'
              }`}
            >
              ${toCurrency(data.totalToReceive - data.totalOwed)}
            </div>
            <p className="card-info">
              {data.totalToReceive >= data.totalOwed ? 'You are owed' : 'You owe'}
            </p>
          </div>
          <div className="overview-card">
            <h3>Active Groups</h3>
            <div className="amount amount-neutral">{data.activeGroupsCount}</div>
            <p className="card-info">Groups you are in</p>
          </div>
        </div>
      </section>

      {/* Active Groups */}
      <section className="page-section">
        <h2>Your Groups</h2>
        {data.activeGroups.length === 0 ? (
          <p className="empty-state">No groups yet. Create one to get started!</p>
        ) : (
          <div className="groups-list">
            {data.activeGroups.map((group) => (
              <div key={group.id} className="group-item">
                <div className="group-info">
                  <h4>{group.name}</h4>
                  <p className="text-muted">
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/groups?id=${group.id}`)}
                >
                  View Group
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Expenses */}
      <section className="page-section">
        <h2>Recent Expenses</h2>
        {data.recentExpenses.length === 0 ? (
          <p className="empty-state">No expenses yet. Add one from a group!</p>
        ) : (
          <div className="expenses-list">
            {data.recentExpenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <h4>{expense.description}</h4>
                  <p className="text-muted">
                    {new Date(expense.createdAt).toLocaleDateString()} · Split{' '}
                    {expense.splitType.toLowerCase()}
                  </p>
                </div>
                <div className="expense-amount">${toCurrency(expense.totalAmount)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
