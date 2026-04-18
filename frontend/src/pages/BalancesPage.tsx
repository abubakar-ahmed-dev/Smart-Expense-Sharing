import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError, Group, GroupMember, PairBalance, UserBalanceSummary, apiClient } from '../lib/api';
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

export default function BalancesPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGroupId = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [balances, setBalances] = useState<PairBalance[]>([]);
  const [summary, setSummary] = useState<UserBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'simplified' | 'detailed'>('simplified');

  const auth = { token: session?.token };

  // Load groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        setError(null);
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

  // Load balances
  useEffect(() => {
    if (!selectedGroupId) return;

    const loadBalances = async () => {
      try {
        setError(null);
        const [balancesData, membersData, summaryData] = await Promise.all([
          apiClient.fetchGroupBalances(selectedGroupId, auth),
          apiClient.fetchGroupMembers(selectedGroupId, auth),
          apiClient.fetchUserBalanceSummary(
            selectedGroupId,
            session?.userId || '',
            auth,
          ),
        ]);

        setBalances(balancesData);
        setMembers(membersData);
        setSummary(summaryData);
      } catch (err) {
        setError(errorToText(err));
      }
    };

    void loadBalances();
  }, [selectedGroupId, session?.userId, session?.token]);

  const memberNameById = members.reduce(
    (acc, member) => {
      acc[member.userId] = member.user.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  const displayName = (userId: string): string => memberNameById[userId] ?? userId.slice(0, 8);

  const currentGroup = groups.find((g) => g.id === selectedGroupId);
  const userOwesAmount = summary?.totalOwed || 0;
  const userIsOvedAmount = summary?.totalReceivable || 0;

  if (loading) {
    return <div className="page-content">Loading balances...</div>;
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

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
          {/* View Mode Toggle */}
          <section className="page-section">
            <div className="view-mode-toggle">
              <button
                className={`toggle-btn ${viewMode === 'simplified' ? 'active' : ''}`}
                onClick={() => setViewMode('simplified')}
              >
                Simplified
              </button>
              <button
                className={`toggle-btn ${viewMode === 'detailed' ? 'active' : ''}`}
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </button>
            </div>
          </section>

          {/* Simplified View */}
          {viewMode === 'simplified' && summary && (
            <section className="page-section">
              <h2>Your Balance</h2>
              <div className="balance-summary-cards">
                <div className="balance-card">
                  <h3>You Owe</h3>
                  <div className={`balance-amount ${userOwesAmount > 0 ? 'negative' : 'neutral'}`}>
                    ${toCurrency(userOwesAmount)}
                  </div>
                </div>
                <div className="balance-card">
                  <h3>Owed to You</h3>
                  <div className={`balance-amount ${userIsOvedAmount > 0 ? 'positive' : 'neutral'}`}>
                    ${toCurrency(userIsOvedAmount)}
                  </div>
                </div>
                <div className="balance-card">
                  <h3>Net Balance</h3>
                  <div
                    className={`balance-amount ${
                      userIsOvedAmount >= userOwesAmount ? 'positive' : 'negative'
                    }`}
                  >
                    ${toCurrency(userIsOvedAmount - userOwesAmount)}
                  </div>
                </div>
              </div>

              {/* Quick Summary */}
              <div className="balance-quick-summary">
                {summary.owes.length > 0 && (
                  <div>
                    <h4>You owe:</h4>
                    <ul className="balance-list">
                      {summary.owes.map((owe) => (
                        <li key={owe.userId}>
                          <span>{displayName(owe.userId)}</span>
                          <span>${toCurrency(owe.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.owedBy.length > 0 && (
                  <div>
                    <h4>Others owe you:</h4>
                    <ul className="balance-list">
                      {summary.owedBy.map((owed) => (
                        <li key={owed.userId}>
                          <span>{displayName(owed.userId)}</span>
                          <span>${toCurrency(owed.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Detailed View */}
          {viewMode === 'detailed' && (
            <section className="page-section">
              <h2>All Balances</h2>
              {balances.length === 0 ? (
                <p className="empty-state">No balances yet. Create an expense to get started!</p>
              ) : (
                <div className="balances-table-wrapper">
                  <table className="balances-table">
                    <thead>
                      <tr>
                        <th>Debtor</th>
                        <th>Creditor</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((balance) => (
                        <tr key={`${balance.debtorUserId}-${balance.creditorUserId}`}>
                          <td className="debtor-cell">{displayName(balance.debtorUserId)}</td>
                          <td className="creditor-cell">{displayName(balance.creditorUserId)}</td>
                          <td className="amount-cell">${toCurrency(balance.netAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
