import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError, Group, GroupMember, Settlement, apiClient } from '../lib/api';
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

export default function SettlementsPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGroupId = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

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

  // Load group members and settlements
  useEffect(() => {
    if (!selectedGroupId) return;

    const loadGroupData = async () => {
      try {
        setError(null);
        setSuccessMessage(null);
        const [membersData, settlementsData] = await Promise.all([
          apiClient.fetchGroupMembers(selectedGroupId, auth),
          apiClient.fetchGroupSettlements(selectedGroupId, auth),
        ]);

        setMembers(membersData);
        setSettlements(settlementsData);

        if (!fromUserId && membersData.length > 0) {
          setFromUserId(membersData[0].userId);
        }
        if (!toUserId && membersData.length > 1) {
          setToUserId(membersData[1].userId);
        }
      } catch (err) {
        setError(errorToText(err));
      }
    };

    void loadGroupData();
  }, [selectedGroupId, session?.token]);

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      setError('Select a group first.');
      return;
    }
    if (!fromUserId) {
      setError('Select who is paying.');
      return;
    }
    if (!toUserId) {
      setError('Select who is receiving.');
      return;
    }
    if (fromUserId === toUserId) {
      setError('Cannot settle with the same person.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const newSettlement = await apiClient.createSettlement(
        selectedGroupId,
        {
          fromUserId,
          toUserId,
          amount: Number(amount),
          idempotencyKey: idempotencyKey || undefined,
        },
        auth,
      );

      setSettlements((prev) => [newSettlement, ...prev]);
      setAmount('');
      setIdempotencyKey('');
      setSuccessMessage('Settlement recorded successfully.');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setSaving(false);
    }
  };

  const currentGroup = groups.find((g) => g.id === selectedGroupId);
  const memberMap = members.reduce(
    (acc, member) => {
      acc[member.userId] = member.user.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  if (loading) {
    return <div className="page-content">Loading settlements...</div>;
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
          {/* Record Settlement Form */}
          <section className="page-section">
            <h2>Record Settlement</h2>
            <form onSubmit={handleRecordSettlement} className="settlement-form">
              <div className="form-row">
                <label>Paid by:</label>
                <select
                  value={fromUserId}
                  onChange={(e) => setFromUserId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Paid to:</label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
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
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  placeholder="Idempotency key (optional, for retries)"
                  disabled={saving}
                />
              </div>

              <button type="submit" disabled={saving || !currentGroup}>
                {saving ? 'Recording...' : 'Record Settlement'}
              </button>
            </form>
          </section>

          {/* Settlement History */}
          <section className="page-section">
            <h2>Settlement History</h2>
            {settlements.length === 0 ? (
              <p className="empty-state">No settlements recorded yet.</p>
            ) : (
              <div className="settlements-list">
                {settlements.map((settlement) => (
                  <div key={settlement.id} className="settlement-entry">
                    <div className="settlement-main">
                      <span className="settlement-from">{settlement.fromUser.name}</span>
                      <span className="settlement-arrow">→</span>
                      <span className="settlement-to">{settlement.toUser.name}</span>
                      <span className="settlement-amount">${toCurrency(settlement.amount)}</span>
                    </div>
                    <p className="text-muted">
                      {new Date(settlement.createdAt).toLocaleString()}
                    </p>
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
