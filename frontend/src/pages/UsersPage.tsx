import { useEffect, useState } from 'react';
import { ApiClientError, User, apiClient } from '../lib/api';
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

export default function UsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = { token: session?.token };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.fetchUsers(auth);
        setUsers(result);
      } catch (err) {
        setError(errorToText(err));
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  if (loading) {
    return <div className="page-content">Loading users...</div>;
  }

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

      <section className="page-section">
        <h2>Users</h2>
        {users.length === 0 ? (
          <p className="empty-state">No users found.</p>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      {user.id === session?.userId && <span className="badge">You</span>}
                    </td>
                    <td>{user.email}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
