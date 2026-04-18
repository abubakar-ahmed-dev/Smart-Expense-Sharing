import { useEffect, useState } from 'react';
import { ApiClientError, Group, apiClient } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

function errorToText(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.payload?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error occurred.';
}

export default function GroupsPage() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const auth = { token: session?.token };

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.fetchGroups(auth);
        setGroups(result);
      } catch (err) {
        setError(errorToText(err));
      } finally {
        setLoading(false);
      }
    };

    void loadGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError('Group name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const newGroup = await apiClient.createGroup(newGroupName.trim(), auth);
      setGroups((prev) => [newGroup, ...prev]);
      setNewGroupName('');
    } catch (err) {
      setError(errorToText(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-content">Loading groups...</div>;
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

      <section className="page-section">
        <h2>Create Group</h2>
        <form onSubmit={handleCreateGroup} className="form-group">
          <div className="form-row">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g., Weekend Trip)"
              disabled={saving}
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-section">
        <h2>Your Groups</h2>
        {groups.length === 0 ? (
          <p className="empty-state">
            No groups yet. Create one above to get started!
          </p>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group.id} className="group-card">
                <h3>{group.name}</h3>
                <p className="text-muted">Created: {new Date(group.createdAt).toLocaleDateString()}</p>
                <button className="btn-secondary">View Group</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
