import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';

const getToken = () => localStorage.getItem('ef_token');

const api = async (path, opts = {}) => {
  const res = await fetch(`/api/admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json;
};

// ── Mini Bar (SVG sparkline) ─────────────────────────────────
function MiniBar({ data, color = '#6366f1' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 140, H = 36;
  const bw = Math.max(Math.floor((W / data.length) * 0.65), 2);
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const bh = Math.max((d.count / max) * (H - 8), 2);
        const x  = (i / data.length) * W + ((W / data.length) - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={bw} height={bh}
              fill={color} rx="2" opacity="0.85" />
            <title>{d.date}: {d.count} signups</title>
          </g>
        );
      })}
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, subColor, color, bg }) {
  return (
    <div style={{
      background: 'var(--bs-body-bg)',
      border: '0.5px solid var(--bs-border-color)',
      borderRadius: 14, padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
          <i className={`bi ${icon}`} />
        </div>
        {sub && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: subColor + '18', color: subColor }}>
            {sub}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, color }}>{value}</div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────
function Badge({ type }) {
  const map = {
    admin:    { label: 'Admin',    bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
    user:     { label: 'User',     bg: 'rgba(100,116,139,0.12)',color: '#64748b' },
    active:   { label: 'Active',   bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
    inactive: { label: 'Inactive', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  };
  const s = map[type] || map.user;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { format } = useCurrency();

  const [tab,          setTab]          = useState('overview');
  const [stats,        setStats]        = useState(null);
  const [users,        setUsers]        = useState([]);
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, pages: 1 });
  const [allExpenses,  setAllExpenses]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [uLoading,     setULoading]     = useState(false);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail,   setUserDetail]   = useState(null);
  const [actionLoading,setActionLoading]= useState('');
  const [toast,        setToast]        = useState('');

  // ── Guard: only admin can see this ──────────────────────────
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Fetch stats ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const json = await api('/stats');
      setStats(json.data);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  // ── Fetch users ─────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setULoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 15,
        ...(search      ? { search }      : {}),
        ...(roleFilter   ? { role: roleFilter }   : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const json = await api(`/users?${params}`);
      setUsers(json.data);
      setPagination(json.pagination);
    } catch (e) { setError(e.message); }
    finally     { setULoading(false); }
  }, [search, roleFilter, statusFilter]);

  // ── Fetch all expenses ───────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setULoading(true);
    try {
      const json = await api('/expenses?limit=30');
      setAllExpenses(json.data);
    } catch (e) { setError(e.message); }
    finally     { setULoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (tab === 'users')    fetchUsers();
    if (tab === 'expenses') fetchExpenses();
  }, [tab, fetchUsers, fetchExpenses]);

  // ── User detail ─────────────────────────────────────────────
  const openUserDetail = async (u) => {
    setSelectedUser(u);
    setUserDetail(null);
    try {
      const json = await api(`/users/${u._id}`);
      setUserDetail(json.data);
    } catch (e) { setError(e.message); }
  };

  // ── Role toggle ─────────────────────────────────────────────
  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Make ${u.username} a ${newRole}?`)) return;
    setActionLoading(u._id + 'role');
    try {
      await api(`/users/${u._id}/role`, {
        method: 'PATCH', body: JSON.stringify({ role: newRole }),
      });
      showToast(`${u.username} is now ${newRole}`);
      fetchUsers(pagination.page);
      if (userDetail?.user?._id === u._id) openUserDetail({ ...u, role: newRole });
    } catch (e) { setError(e.message); }
    finally     { setActionLoading(''); }
  };

  // ── Status toggle ────────────────────────────────────────────
  const toggleStatus = async (u) => {
    const msg = u.isActive ? `Deactivate ${u.username}?` : `Activate ${u.username}?`;
    if (!window.confirm(msg)) return;
    setActionLoading(u._id + 'status');
    try {
      await api(`/users/${u._id}/status`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !u.isActive }),
      });
      showToast(`${u.username} ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers(pagination.page);
    } catch (e) { setError(e.message); }
    finally     { setActionLoading(''); }
  };

  // ── Delete user ──────────────────────────────────────────────
  const deleteUser = async (u) => {
    if (!window.confirm(`DELETE ${u.username}? This removes ALL their data permanently.`)) return;
    setActionLoading(u._id + 'del');
    try {
      await api(`/users/${u._id}`, { method: 'DELETE' });
      showToast(`${u.username} deleted`);
      setSelectedUser(null);
      fetchUsers(1);
      fetchStats();
    } catch (e) { setError(e.message); }
    finally     { setActionLoading(''); }
  };

  const s = stats;

  return (
    <div className="ef-page">

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 9999,
          background: '#22c55e', color: '#fff', padding: '10px 18px',
          borderRadius: 12, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="ef-page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h4 className="ef-page-heading" style={{ margin: 0 }}>Admin Dashboard</h4>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px',
              borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
              🛡️ Admin Only
            </span>
          </div>
          <p className="text-muted small mb-0">
            Full platform control · {s?.users.total || 0} users · {s?.expenses.total || 0} expenses
          </p>
        </div>
        <button className="btn btn-sm" onClick={fetchStats}
          style={{ borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.25)', fontWeight: 600 }}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
          <i className="bi bi-exclamation-triangle-fill" />
          <span style={{ fontSize: 13 }}>{error}</span>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap',
        borderBottom: '0.5px solid var(--bs-border-color)', paddingBottom: 10 }}>
        {[
          { val: 'overview',  label: 'Overview',      icon: 'bi-grid-1x2' },
          { val: 'users',     label: 'Manage Users',  icon: 'bi-people-fill' },
          { val: 'expenses',  label: 'All Expenses',  icon: 'bi-receipt-cutoff' },
        ].map(t => (
          <button key={t.val} type="button" onClick={() => setTab(t.val)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              border: tab === t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
              background: tab === t.val ? 'var(--bs-primary)' : 'transparent',
              color: tab === t.val ? '#fff' : 'var(--bs-secondary-color)',
              transition: 'all .15s',
            }}>
            <i className={`bi ${t.icon}`} style={{ fontSize: 11 }} />{t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner-border text-primary" style={{ width: 32, height: 32 }} />
          <p className="text-muted mt-2 small">Loading admin data…</p>
        </div>
      )}

      {/* ══════ OVERVIEW TAB ══════ */}
      {tab === 'overview' && s && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}
            className="ef-admin-kpis">
            <KpiCard icon="bi-people-fill"      label="Total Users"
              value={s.users.total}
              sub={s.users.growth !== null ? `${s.users.growth > 0 ? '+' : ''}${s.users.growth}% MoM` : null}
              subColor={s.users.growth >= 0 ? '#22c55e' : '#ef4444'}
              color="#6366f1" bg="rgba(99,102,241,0.1)" />

            <KpiCard icon="bi-person-check-fill" label="Active Users"
              value={s.users.active}
              sub={`${s.users.inactive} inactive`}
              subColor="#64748b"
              color="#22c55e" bg="rgba(34,197,94,0.1)" />

            <KpiCard icon="bi-receipt-cutoff"    label="Total Expenses"
              value={s.expenses.total.toLocaleString('en-IN')}
              sub={`${s.expenses.thisMonth} this month`}
              subColor="#6366f1"
              color="#f59e0b" bg="rgba(245,158,11,0.1)" />

            <KpiCard icon="bi-cash-stack"        label="Platform Total Spent"
              value={format(s.expenses.totalAmount)}
              sub={`${format(s.expenses.amountThisMonth)} this month`}
              subColor="#6366f1"
              color="#ec4899" bg="rgba(236,72,153,0.1)" />
          </div>

          {/* Feature usage row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Total Budgets',    val: s.features.budgets,   icon: 'bi-bullseye',      col: '#6366f1' },
              { label: 'Savings Goals',    val: s.features.goals,     icon: 'bi-trophy-fill',   col: '#22c55e' },
              { label: 'Recurring Setup',  val: s.features.recurring, icon: 'bi-arrow-repeat',  col: '#f59e0b' },
            ].map(({ label, val, icon, col }) => (
              <div key={label} style={{ background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)', borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: col + '18', color: col,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  <i className={`bi ${icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)' }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: col }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 2-col: Signups chart + Top spenders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
            className="ef-admin-2col">

            {/* Daily signups chart */}
            <div style={{ background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)', borderRadius: 14, padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                <i className="bi bi-person-plus-fill me-2" style={{ color: '#6366f1' }} />
                Signups — Last 7 Days
              </div>
              <div style={{ marginBottom: 10 }}>
                <MiniBar data={s.dailySignups} color="#6366f1" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: 'var(--bs-secondary-color)' }}>
                {s.dailySignups.map((d, i) => (
                  <span key={i}>{d.date}</span>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bs-secondary-color)' }}>
                New this month: <strong style={{ color: '#6366f1' }}>{s.users.newThisMonth}</strong>
                &nbsp;·&nbsp;Last month: <strong>{s.users.newLastMonth}</strong>
              </div>
            </div>

            {/* Top spenders */}
            <div style={{ background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)', borderRadius: 14, padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                <i className="bi bi-graph-up-arrow me-2" style={{ color: '#f59e0b' }} />
                Top Spenders This Month
              </div>
              {s.topSpenders.length === 0 ? (
                <div className="text-muted small text-center py-3">No expense data yet</div>
              ) : s.topSpenders.map((sp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '0.5px solid var(--bs-border-color)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 12 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }} className="text-truncate">
                      {sp.user?.username}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)' }}>
                      {sp.count} txns
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', flexShrink: 0 }}>
                    {format(sp.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category spend */}
          {s.categorySpend?.length > 0 && (
            <div style={{ background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)', borderRadius: 14, padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                <i className="bi bi-pie-chart-fill me-2" style={{ color: '#ec4899' }} />
                Platform-wide Category Spending
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.categorySpend.map((c, i) => {
                  const maxAmt = s.categorySpend[0]?.total || 1;
                  const pct    = Math.round((c.total / maxAmt) * 100);
                  const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6'];
                  const col    = colors[i % colors.length];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{c._id || 'Others'}</span>
                        <span style={{ color: col, fontWeight: 700 }}>{format(c.total)}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 7,
                        background: 'var(--bs-border-color)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 7,
                          background: col, width: `${pct}%`, transition: 'width .5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ USERS TAB ══════ */}
      {tab === 'users' && (
        <div style={{ display: 'flex', gap: 14 }} className="ef-admin-users-layout">

          {/* User list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search + Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 180 }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: 10,
                  top: '50%', transform: 'translateY(-50%)', color: 'var(--bs-secondary-color)', fontSize: 12 }} />
                <input className="form-control form-control-sm" placeholder="Search name or email…"
                  style={{ paddingLeft: 30, borderRadius: 8 }}
                  value={search} onChange={e => { setSearch(e.target.value); fetchUsers(1); }} />
              </div>
              <select className="form-select form-select-sm" style={{ width: 110, borderRadius: 8 }}
                value={roleFilter} onChange={e => { setRoleFilter(e.target.value); fetchUsers(1); }}>
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select className="form-select form-select-sm" style={{ width: 120, borderRadius: 8 }}
                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchUsers(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 10 }}>
              {pagination.total} users found
            </div>

            {uLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map(u => (
                  <div key={u._id}
                    onClick={() => openUserDetail(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      background: selectedUser?._id === u._id
                        ? 'rgba(99,102,241,0.06)' : 'var(--bs-body-bg)',
                      border: selectedUser?._id === u._id
                        ? '1.5px solid rgba(99,102,241,0.35)' : '0.5px solid var(--bs-border-color)',
                      transition: 'all .15s',
                    }}>
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: u.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.12)',
                      color: u.role === 'admin' ? '#6366f1' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15 }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }} className="text-truncate">
                          {u.username}
                        </span>
                        <Badge type={u.role} />
                        <Badge type={u.isActive ? 'active' : 'inactive'} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }} className="text-truncate">
                        {u.email} · {u.expenseCount} txns · {format(u.totalSpent)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {/* Role toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleRole(u); }}
                        disabled={u._id === (typeof window !== 'undefined' && localStorage.getItem('ef_uid')) || actionLoading === u._id + 'role'}
                        className="btn btn-sm"
                        style={{ borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700,
                          background: u.role === 'admin' ? 'rgba(99,102,241,0.1)' : 'rgba(100,116,139,0.1)',
                          color: u.role === 'admin' ? '#6366f1' : '#64748b',
                          border: `1px solid ${u.role === 'admin' ? 'rgba(99,102,241,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
                        {actionLoading === u._id + 'role'
                          ? <span className="spinner-border spinner-border-sm" />
                          : u.role === 'admin' ? '👑 Admin' : 'Make Admin'}
                      </button>

                      {/* Status toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleStatus(u); }}
                        disabled={actionLoading === u._id + 'status'}
                        className="btn btn-sm"
                        style={{ borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700,
                          background: u.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                          color: u.isActive ? '#dc2626' : '#16a34a',
                          border: `1px solid ${u.isActive ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}` }}>
                        {actionLoading === u._id + 'status'
                          ? <span className="spinner-border spinner-border-sm" />
                          : u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} type="button" onClick={() => fetchUsers(p)}
                    className="btn btn-sm"
                    style={{ borderRadius: 8, minWidth: 34,
                      background: pagination.page === p ? 'var(--bs-primary)' : 'transparent',
                      color: pagination.page === p ? '#fff' : 'var(--bs-secondary-color)',
                      border: '0.5px solid var(--bs-border-color)' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User detail panel */}
          {selectedUser && (
            <div style={{ width: 280, flexShrink: 0, background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)', borderRadius: 16,
              padding: '18px', alignSelf: 'flex-start', position: 'sticky', top: 80 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>User Detail</div>
                <button onClick={() => setSelectedUser(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: 'var(--bs-secondary-color)', lineHeight: 1 }}>
                  ×
                </button>
              </div>

              {/* Avatar */}
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 8px',
                  background: selectedUser.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.12)',
                  color: selectedUser.role === 'admin' ? '#6366f1' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 22 }}>
                  {selectedUser.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedUser.username}</div>
                <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 8 }}>
                  {selectedUser.email}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <Badge type={selectedUser.role} />
                  <Badge type={selectedUser.isActive ? 'active' : 'inactive'} />
                </div>
              </div>

              {userDetail ? (
                <>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Expenses', val: userDetail.summary.totalExpenses, col: '#6366f1' },
                      { label: 'Total Spent', val: format(userDetail.summary.totalSpent), col: '#f59e0b' },
                      { label: 'This Month', val: format(userDetail.summary.thisMonthSpent), col: '#22c55e' },
                      { label: 'Budgets', val: userDetail.summary.budgetCount, col: '#ec4899' },
                    ].map(({ label, val, col }) => (
                      <div key={label} style={{ background: 'var(--bs-secondary-bg, rgba(0,0,0,0.03))',
                        borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: col }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent expenses */}
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Recent Expenses</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                    {userDetail.recentExpenses.slice(0, 5).map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                        padding: '5px 0', borderBottom: '0.5px solid var(--bs-border-color)', fontSize: 11 }}>
                        <span className="text-truncate" style={{ maxWidth: 150 }}>
                          {e.category?.icon} {e.description}
                        </span>
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>{format(e.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Salary */}
                  {selectedUser.settings?.monthlySalary > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 12 }}>
                      Salary: <strong>{format(selectedUser.settings.monthlySalary)}/mo</strong>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm w-100" onClick={() => toggleRole(selectedUser)}
                  style={{ borderRadius: 8, fontWeight: 600,
                    background: selectedUser.role === 'admin' ? 'rgba(100,116,139,0.1)' : 'rgba(99,102,241,0.1)',
                    color: selectedUser.role === 'admin' ? '#64748b' : '#6366f1',
                    border: '1px solid var(--bs-border-color)' }}>
                  <i className="bi bi-shield-fill me-1" />
                  {selectedUser.role === 'admin' ? 'Remove Admin Role' : 'Make Admin'}
                </button>
                <button className="btn btn-sm w-100" onClick={() => toggleStatus(selectedUser)}
                  style={{ borderRadius: 8, fontWeight: 600,
                    background: selectedUser.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                    color: selectedUser.isActive ? '#d97706' : '#16a34a',
                    border: '1px solid var(--bs-border-color)' }}>
                  <i className={`bi ${selectedUser.isActive ? 'bi-person-dash' : 'bi-person-check'} me-1`} />
                  {selectedUser.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
                <button className="btn btn-sm btn-outline-danger w-100"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  onClick={() => deleteUser(selectedUser)}>
                  <i className="bi bi-trash3 me-1" />Delete + All Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ EXPENSES TAB ══════ */}
      {tab === 'expenses' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginBottom: 12 }}>
            Latest 30 expenses across all users
          </div>
          {uLoading ? (
            <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allExpenses.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  background: 'var(--bs-body-bg)', border: '0.5px solid var(--bs-border-color)',
                  borderRadius: 11,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(99,102,241,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {e.category?.icon || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }} className="text-truncate">
                      {e.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>
                      <span style={{ fontWeight: 600, color: '#6366f1' }}>
                        @{e.user?.username}
                      </span>
                      {' · '}{e.category?.name || 'Others'}
                      {' · '}{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {format(e.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media(min-width:576px){ .ef-admin-kpis { grid-template-columns: repeat(4,1fr) !important; } }
        @media(max-width:767px){ .ef-admin-users-layout { flex-direction: column !important; } }
        @media(min-width:768px){ .ef-admin-2col { grid-template-columns: 1fr 1fr !important; } }
        @media(max-width:767px){ .ef-admin-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}