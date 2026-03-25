import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QuickAddFAB from '../expenses/QuickAddFAB';

const NAV = [
  { to: '/dashboard',   icon: 'bi-grid-1x2-fill',  label: 'Dashboard'   },
  { to: '/expenses',    icon: 'bi-receipt-cutoff',  label: 'Expenses'    },
  { to: '/budgets',     icon: 'bi-bullseye',        label: 'Budgets'     },
  { to: '/predictions', icon: 'bi-graph-up-arrow',  label: 'Predictions' },
  { to: '/settings',    icon: 'bi-gear-fill',       label: 'Settings'    },
];

function applyTheme(isDark) {
  const root = document.documentElement;
  root.setAttribute('data-theme',    isDark ? 'dark' : 'light');
  root.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile drawer
  const [collapsed,   setCollapsed]   = useState(false);   // desktop collapse
  const [dark,        setDark]        = useState(() => localStorage.getItem('ef_theme') === 'dark');
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const avatarRef = useRef(null);

  // Apply theme on mount + change
  useEffect(() => { applyTheme(dark); }, [dark]);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target))
        setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update page title from nav label
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

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div className="ef-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════════════════
          SIDEBAR
      ════════════════════════════ */}
      <aside className="ef-sidebar">
        {/* Brand */}
        <div className="ef-sidebar__brand">
          <span className="ef-sidebar__logo">
            <i className="bi bi-lightning-charge-fill" />
          </span>
          {!collapsed && <span className="ef-sidebar__name">ExpenseFlow</span>}
          {/* Mobile close button */}
          <button className="ef-sidebar__mobile-close d-md-none" onClick={() => setSidebarOpen(false)}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button className="ef-sidebar__toggle d-none d-md-block" onClick={() => setCollapsed(!collapsed)}>
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>

        {/* Nav links */}
        <nav className="ef-sidebar__nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `ef-nav-link ${isActive ? 'ef-nav-link--active' : ''}`}>
              <i className={`bi ${icon}`} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer — user info + logout */}
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

      {/* ════════════════════════════
          MAIN AREA
      ════════════════════════════ */}
      <div className="ef-main">

        {/* ── Topbar ── */}
        <header className="ef-topbar">
          {/* Left: hamburger (mobile) + page title */}
          <div className="ef-topbar__left d-flex align-items-center gap-3">
            <button className="ef-hamburger d-md-none" onClick={() => setSidebarOpen(true)}>
              <i className="bi bi-list" />
            </button>
            <div>
              <h5 className="ef-topbar__title mb-0" id="page-title">{currentPage}</h5>
            </div>
          </div>

          {/* Right: dark mode + avatar dropdown */}
          <div className="ef-topbar__right d-flex align-items-center gap-2">
            {/* Dark mode toggle */}
            <button className="ef-topbar-icon-btn" onClick={toggleDark}
              title={dark ? 'Light mode' : 'Dark mode'}>
              <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
            </button>

            {/* Avatar dropdown */}
            <div className="ef-avatar-wrapper" ref={avatarRef}>
              <button
                className={`ef-avatar-btn ${avatarOpen ? 'ef-avatar-btn--open' : ''}`}
                onClick={() => setAvatarOpen(!avatarOpen)}
                title="Account menu"
              >
                <div className="ef-avatar ef-avatar--sm">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="ef-avatar-info d-none d-md-block">
                  <span className="ef-avatar-name">{user?.username}</span>
                </div>
                <i className={`bi bi-chevron-down ef-avatar-chevron d-none d-md-inline ${avatarOpen ? 'rotated' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {avatarOpen && (
                <div className="ef-avatar-dropdown">
                  {/* User info header */}
                  <div className="ef-avatar-dropdown__header">
                    <div className="ef-avatar ef-avatar--lg">
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="ef-avatar-dropdown__name">{user?.username}</div>
                      <div className="ef-avatar-dropdown__email">{user?.email}</div>
                    </div>
                  </div>

                  <div className="ef-avatar-dropdown__divider" />

                  {/* Menu items */}
                  {[
                    { icon: 'bi-grid-1x2-fill',  label: 'Dashboard',   to: '/dashboard'   },
                    { icon: 'bi-gear-fill',       label: 'Settings',    to: '/settings'    },
                  ].map(({ icon, label, to }) => (
                    <button key={to} className="ef-avatar-dropdown__item"
                      onClick={() => { setAvatarOpen(false); navigate(to); }}>
                      <i className={`bi ${icon}`} />
                      <span>{label}</span>
                    </button>
                  ))}

                  {/* Dark mode toggle in dropdown */}
                  <button className="ef-avatar-dropdown__item" onClick={() => { toggleDark(); setAvatarOpen(false); }}>
                    <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
                    <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
                    <span className="ef-avatar-dropdown__badge ms-auto">
                      {dark ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <div className="ef-avatar-dropdown__divider" />

                  {/* Logout */}
                  <button className="ef-avatar-dropdown__item ef-avatar-dropdown__item--danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="ef-content">
          <Outlet />
        </main>

        {/* ── Mobile bottom navigation ── */}
        <nav className="ef-mobile-nav d-md-none">
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `ef-mobile-nav__item ${isActive ? 'ef-mobile-nav__item--active' : ''}`}>
              <i className={`bi ${icon}`} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* FAB — rendered outside ef-main, visible on every page */}
      <QuickAddFAB />
    </div>
  );
}