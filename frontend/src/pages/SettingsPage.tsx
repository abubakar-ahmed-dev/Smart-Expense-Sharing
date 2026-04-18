import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page-content">
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
          <div className="info-row">
            <label>Verification Status</label>
            <p className={session?.isVerified ? 'text-success' : 'text-warning'}>
              {session?.isVerified ? '✓ Verified' : '⚠ Unverified'}
            </p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2>Account Settings</h2>
        <div className="settings-actions">
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
          <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete Account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="confirm-dialog">
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" disabled>
                Delete (Coming Soon)
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
