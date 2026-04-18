import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '⮞' },
  { label: 'Groups', path: '/groups', icon: '⮞' },
  { label: 'Expenses', path: '/expenses', icon: '⮞' },
  { label: 'Balances', path: '/balances', icon: '⮞' },
  { label: 'Settlements', path: '/settlements', icon: '⮞' },
  { label: 'Users', path: '/users', icon: '⮞' },
  { label: 'Settings', path: '/settings', icon: '⮞' },
];

export function AppLayout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Expenses</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="layout-main">
        <header className="app-header">
          <div className="header-title">
            <h1>
              {NAV_ITEMS.find((item) => isActive(item.path))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{session?.name || 'User'}</span>
              <span className="user-email">{session?.email || 'user@example.com'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
