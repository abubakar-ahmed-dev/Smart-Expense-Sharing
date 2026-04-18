import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AccountDeletionStatus, ApiClientError, UserPhone, apiClient } from '../lib/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [phones, setPhones] = useState<UserPhone[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState('');
  const [addingPhone, setAddingPhone] = useState(false);
  const [deletingPhoneId, setDeletingPhoneId] = useState<string | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null);

  const auth = { token: session?.token };

  // Load user phones on mount
  useEffect(() => {
    if (session?.userId) {
      loadPhones();
      loadAccountDeletionStatus();
    }
  }, [session?.userId]);

  const loadAccountDeletionStatus = async () => {
    if (!session?.userId) return;

    try {
      const status = await apiClient.fetchAccountDeletionStatus(session.userId, auth);
      setDeletionStatus(status);
    } catch {
      setDeletionStatus({ outstandingDebt: 0, canDelete: true });
    }
  };

  const loadPhones = async () => {
    if (!session?.userId) return;
    try {
      setLoadingPhones(true);
      setError(null);
      const userPhones = await apiClient.fetchUserPhones(session.userId, auth);
      setPhones(userPhones);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.payload?.message : 'Failed to load phone numbers';
      setError(message || 'Failed to load phone numbers');
    } finally {
      setLoadingPhones(false);
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !newPhoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    try {
      setAddingPhone(true);
      setError(null);
      setSuccessMessage(null);
      const phone = await apiClient.addPhoneNumber(session.userId, newPhoneNumber, newPhoneLabel || undefined, auth);
      setPhones((prev) => [...prev, phone]);
      setNewPhoneNumber('');
      setNewPhoneLabel('');
      setSuccessMessage('Phone number added successfully');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.payload?.message : 'Failed to add phone number';
      setError(message || 'Failed to add phone number');
    } finally {
      setAddingPhone(false);
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    if (!session?.userId) return;

    try {
      setDeletingPhoneId(phoneId);
      setError(null);
      setSuccessMessage(null);
      await apiClient.deletePhoneNumber(session.userId, phoneId, auth);
      setPhones((prev) => prev.filter((p) => p.id !== phoneId));
      setSuccessMessage('Phone number deleted successfully');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.payload?.message : 'Failed to delete phone number';
      setError(message || 'Failed to delete phone number');
    } finally {
      setDeletingPhoneId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (!session?.userId) return;

    if (deletionStatus && !deletionStatus.canDelete) {
      setError('Settle all outstanding balances before deleting your account');
      return;
    }

    try {
      setDeletingAccount(true);
      setError(null);
      setSuccessMessage(null);
      await apiClient.deleteUser(session.userId, auth);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.payload?.message : 'Failed to delete account';
      setError(message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <section className="page-section">
        <h2>Profile Information</h2>
        <div className="profile-info">
          <div className="info-row">
            <label>Name</label>
            <p>{session?.name || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label>Email</label>
            <p>{session?.email || 'N/A'}</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2>Contact Numbers</h2>
        {loadingPhones ? (
          <p>Loading phone numbers...</p>
        ) : (
          <>
            {phones.length > 0 ? (
              <div className="phones-list">
                {phones.map((phone) => (
                  <div key={phone.id} className="phone-item">
                    <div className="phone-info">
                      <div>
                        <strong>{phone.number}</strong>
                        {phone.label && <span className="phone-label"> ({phone.label})</span>}
                      </div>
                      <small className="text-muted">Added {new Date(phone.createdAt).toLocaleDateString()}</small>
                    </div>
                    <button
                      onClick={() => handleDeletePhone(phone.id)}
                      disabled={deletingPhoneId === phone.id}
                      className="btn-danger-small"
                    >
                      {deletingPhoneId === phone.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No phone numbers added yet.</p>
            )}

            <form onSubmit={handleAddPhone} className="add-phone-form">
              <h3>Add New Phone Number</h3>
              <div className="form-row">
                <input
                  type="tel"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="Phone number (e.g., +1-234-567-8900)"
                  disabled={addingPhone}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  value={newPhoneLabel}
                  onChange={(e) => setNewPhoneLabel(e.target.value)}
                  placeholder="Label (optional, e.g., mobile, work, home)"
                  disabled={addingPhone}
                />
              </div>
              <button type="submit" disabled={addingPhone}>
                {addingPhone ? 'Adding...' : 'Add Phone Number'}
              </button>
            </form>
          </>
        )}
      </section>

      <section className="page-section">
        <h2>Account Settings</h2>
        <div className="settings-actions">
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
          <button
            className="btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deletionStatus ? !deletionStatus.canDelete : true}
          >
            Delete Account
          </button>
        </div>

        {deletionStatus && !deletionStatus.canDelete && (
          <p className="text-muted">
            You currently owe money and cannot delete your account until your outstanding balance is settled.
          </p>
        )}

        {showDeleteConfirm && (
          <div className="confirm-dialog">
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            {deletionStatus && !deletionStatus.canDelete && (
              <p className="text-muted">
                Outstanding balance: {deletionStatus.outstandingDebt}
              </p>
            )}
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || (deletionStatus ? !deletionStatus.canDelete : true)}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
