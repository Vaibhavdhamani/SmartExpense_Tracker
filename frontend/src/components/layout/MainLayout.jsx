import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }      from '../../context/AuthContext';
import { useRecurring } from '../../hooks/useRecurring';
import QuickAddFAB      from '../expenses/QuickAddFAB';

const NAV = [
  { to: '/dashboard',   icon: 'bi-grid-1x2-fill',  label: 'Dashboard'   },
  { to: '/expenses',    icon: 'bi-receipt-cutoff',  label: 'Expenses'    },
  { to: '/budgets',     icon: 'bi-bullseye',        label: 'Budgets'     },
  { to: '/recurring',   icon: 'bi-arrow-repeat',    label: 'Recurring'   },
  { to: '/goals',       icon: 'bi-trophy-fill',     label: 'Goals'       },
  { to: '/split',       icon: 'bi-scissors',        label: 'Split'       },
  { to: '/predictions', icon: 'bi-graph-up-arrow',  label: 'Predictions' },
  { to: '/settings',    icon: 'bi-gear-fill',       label: 'Settings'    },
];

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme',    isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dueItems } = useRecurring();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [dark,        setDark]        = useState(() => localStorage.getItem('ef_theme') === 'dark');
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => { applyTheme(dark); }, [dark]);
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target))
        setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const match = NAV.find(n => location.pathname.startsWith(n.to));
    const el    = document.getElementById('page-title');
    if (el && match) el.textContent = match.label;
  }, [location.pathname]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('ef_theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => {
    setAvatarOpen(false);
    logout();
    navigate('/login');
  };

  const currentPage = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard';

  return (
    <div className={`ef-layout ${collapsed ? 'ef-layout--collapsed' : ''} ${sidebarOpen ? 'ef-layout--mobile-open' : ''}`}>

      {sidebarOpen && (
        <div className="ef-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className="ef-sidebar">
        <div className="ef-sidebar__brand">
          <span className="ef-sidebar__logo"><i className="bi bi-lightning-charge-fill" /></span>
          {!collapsed && <span className="ef-sidebar__name">ExpenseFlow</span>}
          <button className="ef-sidebar__mobile-close d-md-none" onClick={() => setSidebarOpen(false)}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <button className="ef-sidebar__toggle d-none d-md-block" onClick={() => setCollapsed(!collapsed)}>
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>

        <nav className="ef-sidebar__nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `ef-nav-link ${isActive ? 'ef-nav-link--active' : ''}`}>
              <i className={`bi ${icon}`} />
              {!collapsed && (
                <span className="d-flex align-items-center gap-2 flex-grow-1">
                  {label}
                  {to === '/recurring' && dueItems.length > 0 && (
                    <span className="badge bg-warning text-dark ms-auto" style={{ fontSize: 10 }}>
                      {dueItems.length}
                    </span>
                  )}
                </span>
              )}
              {collapsed && to === '/recurring' && dueItems.length > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--bs-warning)',
                }} />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ef-sidebar__footer">
          <div className="ef-sidebar__user">
            <div className="ef-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            {!collapsed && (
              <div className="ef-sidebar__user-info">
                <span className="ef-sidebar__username">{user?.username}</span>
                <span className="ef-sidebar__email">{user?.email}</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="btn btn-outline-danger btn-sm w-100 mt-2 ef-logout-btn" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-2" />Logout
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ef-main">
        <header className="ef-topbar">
          <div className="ef-topbar__left d-flex align-items-center gap-3">
            <button className="ef-hamburger d-md-none" onClick={() => setSidebarOpen(true)}>
              <i className="bi bi-list" />
            </button>
            <h5 className="ef-topbar__title mb-0" id="page-title">{currentPage}</h5>
          </div>

          <div className="ef-topbar__right d-flex align-items-center gap-2">
            {dueItems.length > 0 && (
              <button className="ef-topbar-icon-btn position-relative"
                onClick={() => navigate('/recurring')} title={`${dueItems.length} recurring due`}>
                <i className="bi bi-bell-fill text-warning" />
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--bs-danger)',
                }} />
              </button>
            )}

            <button className="ef-topbar-icon-btn" onClick={toggleDark}
              title={dark ? 'Light mode' : 'Dark mode'}>
              <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
            </button>

            <div className="ef-avatar-wrapper" ref={avatarRef}>
              <button
                className={`ef-avatar-btn ${avatarOpen ? 'ef-avatar-btn--open' : ''}`}
                onClick={() => setAvatarOpen(!avatarOpen)}>
                <div className="ef-avatar ef-avatar--sm">{user?.username?.[0]?.toUpperCase()}</div>
                <div className="ef-avatar-info d-none d-md-block">
                  <span className="ef-avatar-name">{user?.username}</span>
                </div>
                <i className={`bi bi-chevron-down ef-avatar-chevron d-none d-md-inline ${avatarOpen ? 'rotated' : ''}`} />
              </button>

              {avatarOpen && (
                <div className="ef-avatar-dropdown">
                  <div className="ef-avatar-dropdown__header">
                    <div className="ef-avatar ef-avatar--lg">{user?.username?.[0]?.toUpperCase()}</div>
                    <div>
                      <div className="ef-avatar-dropdown__name">{user?.username}</div>
                      <div className="ef-avatar-dropdown__email">{user?.email}</div>
                    </div>
                  </div>
                  <div className="ef-avatar-dropdown__divider" />
                  {[
                    { icon: 'bi-grid-1x2-fill', label: 'Dashboard', to: '/dashboard' },
                    { icon: 'bi-scissors',       label: 'Split',     to: '/split'     },
                    { icon: 'bi-gear-fill',      label: 'Settings',  to: '/settings'  },
                  ].map(({ icon, label, to }) => (
                    <button key={to} className="ef-avatar-dropdown__item"
                      onClick={() => { setAvatarOpen(false); navigate(to); }}>
                      <i className={`bi ${icon}`} /><span>{label}</span>
                    </button>
                  ))}
                  <button className="ef-avatar-dropdown__item"
                    onClick={() => { toggleDark(); setAvatarOpen(false); }}>
                    <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
                    <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                    <span className="ef-avatar-dropdown__badge ms-auto">{dark ? 'ON' : 'OFF'}</span>
                  </button>
                  <div className="ef-avatar-dropdown__divider" />
                  <button className="ef-avatar-dropdown__item ef-avatar-dropdown__item--danger"
                    onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right" /><span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="ef-content"><Outlet /></main>

        {/* Mobile bottom nav */}
        <nav className="ef-mobile-nav d-md-none">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `ef-mobile-nav__item ${isActive ? 'ef-mobile-nav__item--active' : ''}`}>
              <span className="position-relative d-inline-block">
                <i className={`bi ${icon}`} />
                {to === '/recurring' && dueItems.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -4,
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--bs-warning)',
                  }} />
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <QuickAddFAB />
    </div>
  );
}