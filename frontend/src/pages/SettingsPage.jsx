import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../context/AuthContext';
import { useToast }    from '../context/ToastContext';
import { useCurrency } from '../hooks/useCurrency';
import api from '../services/api';

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { toast }  = useToast();
  const { format } = useCurrency();
  const navigate   = useNavigate();

  const [settings, setSettings] = useState(user?.settings || {
    currency:           'INR',
    dateFormat:         'DD/MM/YYYY',
    emailNotifications: true,
    budgetAlerts:       true,
    weeklyReports:      false,
    monthlySalary:      0,        // ← NEW
  });
  const [pwForm,  setPwForm]  = useState({ current: '', next: '', confirm: '' });
  const [delText, setDelText] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [tab,     setTab]     = useState('preferences');

  // Live preview for currency selector
  const previewAmount = 1000;
  const getPreview = (cur) => {
    if (cur === 'USD') return `$${(previewAmount / 90).toFixed(2)} (₹${previewAmount} ÷ 90)`;
    if (cur === 'INR') return `₹${previewAmount.toFixed(2)}`;
    return `₹${previewAmount.toFixed(2)} (stored in INR)`;
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/users/settings', { settings });
      updateUser({ settings });
      toast(`Settings saved!${settings.monthlySalary > 0 ? ` Salary ₹${settings.monthlySalary.toLocaleString('en-IN')} set.` : ''}`);
    } catch (err) {
      updateUser({ settings });
      toast('Saved locally. ' + (err.response?.data?.error || ''), 'warning');
    } finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return toast('Passwords do not match', 'error');
    if (pwForm.next.length < 6) return toast('Minimum 6 characters', 'error');
    setSaving(true);
    try {
      await api.put('/users/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  const exportData = async () => {
    try {
      const res = await api.get('/users/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `expenses-${Date.now()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Data exported!');
    } catch { toast('Export failed', 'error'); }
  };

  const deleteAccount = async () => {
    if (delText !== 'DELETE') return toast('Type DELETE to confirm', 'error');
    try {
      await api.delete('/users/account');
      logout(); navigate('/login');
    } catch (err) {
      toast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div className="ef-page" style={{ maxWidth: 680 }}>
      <h4 className="fw-bold mb-4">Account Settings</h4>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {[
          ['preferences', 'gear',       'Preferences'],
          ['security',    'shield-lock', 'Security'],
          ['data',        'database',    'Data & Privacy'],
        ].map(([k, icon, label]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <i className={`bi bi-${icon} me-2`} />{label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── PREFERENCES ── */}
      {tab === 'preferences' && (
        <div className="card ef-card">
          <div className="card-body">

            {/* ══ MONTHLY SALARY ══ */}
            <h6 className="ef-card-title mb-3">
              <i className="bi bi-wallet2 me-2" />Monthly Income
            </h6>

            <div className="mb-4">
              <label className="form-label fw-semibold">Monthly take-home salary</label>
              <div className="input-group" style={{ maxWidth: 260 }}>
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="form-control"
                  placeholder="e.g. 50000"
                  value={settings.monthlySalary || ''}
                  onChange={e => setSettings(p => ({
                    ...p,
                    monthlySalary: parseFloat(e.target.value) || 0
                  }))}
                />
              </div>

              {/* Live feedback */}
              {settings.monthlySalary > 0 ? (
                <div className="mt-2 p-2 rounded" style={{
                  background: 'var(--bs-success-bg-subtle)',
                  border: '1px solid var(--bs-success-border-subtle)',
                  maxWidth: 340
                }}>
                  <small className="text-success d-block">
                    <i className="bi bi-check-circle-fill me-1" />
                    <strong>₹{Number(settings.monthlySalary).toLocaleString('en-IN')}/month</strong> set
                  </small>
                  <small className="text-muted d-block mt-1">
                    Savings tracking enabled on Dashboard, Expenses, Budgets &amp; Predictions pages.
                  </small>
                </div>
              ) : (
                <small className="text-muted d-block mt-1">
                  <i className="bi bi-info-circle me-1" />
                  Set your salary to unlock savings tracking across the app.
                </small>
              )}
            </div>

            <hr className="my-3" />

            {/* ══ CURRENCY ══ */}
            <h6 className="ef-card-title mb-3">
              <i className="bi bi-currency-exchange me-2" />Currency &amp; Display
            </h6>

            <div className="mb-4">
              <label className="form-label fw-semibold">Display Currency</label>
              <div className="ef-currency-grid">
                {[
                  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', supported: true },
                  { code: 'USD', symbol: '$', name: 'US Dollar',     flag: '🇺🇸', supported: true },
                  { code: 'EUR', symbol: '€', name: 'Euro',          flag: '🇪🇺', supported: false },
                  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', supported: false },
                ].map(({ code, symbol, name, flag, supported }) => (
                  <button key={code} type="button"
                    className={`ef-currency-btn ${settings.currency === code ? 'ef-currency-btn--active' : ''} ${!supported ? 'ef-currency-btn--unsupported' : ''}`}
                    onClick={() => setSettings(p => ({ ...p, currency: code }))}>
                    <span className="ef-currency-btn__flag">{flag}</span>
                    <span className="ef-currency-btn__symbol">{symbol}</span>
                    <span className="ef-currency-btn__name">{name}</span>
                    {settings.currency === code && (
                      <span className="ef-currency-btn__check">
                        <i className="bi bi-check-circle-fill" />
                      </span>
                    )}
                    {!supported && <span className="ef-currency-btn__tag">INR display</span>}
                  </button>
                ))}
              </div>

              {/* Currency preview */}
              <div className="ef-currency-preview">
                <div className="ef-currency-preview__label">
                  <i className="bi bi-eye me-2" />Live Preview
                </div>
                <div className="ef-currency-preview__row">
                  <span className="text-muted small">Sample amount (₹1,000 stored)</span>
                  <span className="ef-currency-preview__value">{getPreview(settings.currency)}</span>
                </div>
                {settings.currency === 'USD' && (
                  <div className="ef-currency-preview__note ef-currency-preview__note--info">
                    <i className="bi bi-info-circle me-2" />
                    Displayed in USD at fixed rate <strong>1 USD = ₹90</strong>. Data stored in INR.
                  </div>
                )}
                {settings.currency === 'INR' && (
                  <div className="ef-currency-preview__note ef-currency-preview__note--success">
                    <i className="bi bi-check-circle me-2" />
                    Amounts displayed in Indian Rupees (₹). No conversion applied.
                  </div>
                )}
                {(settings.currency === 'EUR' || settings.currency === 'GBP') && (
                  <div className="ef-currency-preview__note ef-currency-preview__note--warning">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {settings.currency} conversion not supported yet. Displaying in ₹ INR.
                  </div>
                )}
              </div>
            </div>

            {/* ══ DATE FORMAT ══ */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6">
                <label className="form-label fw-semibold">Date Format</label>
                <select className="form-select" value={settings.dateFormat}
                  onChange={e => setSettings(p => ({ ...p, dateFormat: e.target.value }))}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            {/* ══ NOTIFICATIONS ══ */}
            <h6 className="ef-card-title mb-3">
              <i className="bi bi-bell me-2" />Notifications
            </h6>
            {[
              ['emailNotifications', 'Email Notifications', 'Receive email reports about your spending'],
              ['budgetAlerts',       'Budget Alerts',        'Get notified when you approach budget limits'],
              ['weeklyReports',      'Weekly Reports',       'Receive a summary every week'],
            ].map(([key, label, desc]) => (
              <div className="form-check form-switch mb-3" key={key}>
                <input className="form-check-input" type="checkbox" id={key}
                  checked={settings[key]}
                  onChange={e => setSettings(p => ({ ...p, [key]: e.target.checked }))} />
                <label className="form-check-label" htmlFor={key}>
                  <strong className="d-block">{label}</strong>
                  <small className="text-muted">{desc}</small>
                </label>
              </div>
            ))}

            <div className="text-end">
              <button className="btn ef-btn-primary" onClick={saveSettings} disabled={saving}>
                {saving
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="bi bi-check-lg me-2" />}
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div className="card ef-card">
          <div className="card-body">
            <h6 className="ef-card-title mb-3"><i className="bi bi-lock me-2" />Change Password</h6>
            <form onSubmit={changePw}>
              {[
                ['current', 'Current Password', pwForm.current],
                ['next',    'New Password',     pwForm.next],
                ['confirm', 'Confirm Password', pwForm.confirm],
              ].map(([k, label, val]) => (
                <div className="mb-3" key={k}>
                  <label className="form-label">{label}</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-lock" /></span>
                    <input type={showPw ? 'text' : 'password'} className="form-control"
                      placeholder="••••••••" value={val}
                      onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))}
                      required minLength={k !== 'current' ? 6 : 1} />
                  </div>
                </div>
              ))}
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="showPw"
                  checked={showPw} onChange={e => setShowPw(e.target.checked)} />
                <label className="form-check-label" htmlFor="showPw">Show passwords</label>
              </div>
              <button type="submit" className="btn ef-btn-primary" disabled={saving}>
                {saving
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : <i className="bi bi-shield-check me-2" />}
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── DATA ── */}
      {tab === 'data' && (
        <div className="d-flex flex-column gap-4">
          <div className="card ef-card">
            <div className="card-body">
              <h6 className="ef-card-title mb-1"><i className="bi bi-download me-2" />Export Your Data</h6>
              <p className="text-muted small mb-3">Download all expense history as a CSV file (amounts in INR).</p>
              <button className="btn btn-outline-primary" onClick={exportData}>
                <i className="bi bi-file-earmark-spreadsheet me-2" />Export as CSV
              </button>
            </div>
          </div>

          <div className="card ef-card border-danger border-opacity-25">
            <div className="card-body">
              <h6 className="ef-card-title text-danger mb-1">
                <i className="bi bi-exclamation-triangle me-2" />Danger Zone
              </h6>
              <p className="text-muted small mb-3">
                Permanently delete your account and all data. This cannot be undone.
              </p>
              <div className="mb-3">
                <label className="form-label small">Type <strong>DELETE</strong> to confirm</label>
                <input type="text" className="form-control form-control-sm border-danger"
                  placeholder="DELETE" value={delText}
                  onChange={e => setDelText(e.target.value)} />
              </div>
              <button className="btn btn-danger" onClick={deleteAccount} disabled={delText !== 'DELETE'}>
                <i className="bi bi-trash me-2" />Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}