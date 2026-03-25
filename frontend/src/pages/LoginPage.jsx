import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (!res.success) setError(res.error || 'Login failed');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Network error. Is the server running?');
    } finally { setLoading(false); }
  };

  return (
    <div className="ef-auth-root">
      <div className="ef-auth-left">
        <div className="ef-auth-brand">
          <i className="bi bi-lightning-charge-fill ef-auth-icon" />
          <h1>ExpenseFlow</h1>
          <p>Smart Budget Tracking with AI Predictions</p>
        </div>
        <div className="ef-auth-features">
          {[
            ['bi-graph-up-arrow',    'AI Budget Predictions',    'ML model forecasts next month spending'],
            ['bi-bullseye',          'Budget Goals',             'Set limits per category, track progress'],
            ['bi-pie-chart-fill',    'Visual Analytics',         'Beautiful charts and spending breakdowns'],
          ].map(([icon, title, desc]) => (
            <div className="ef-auth-feature" key={title}>
              <div className="ef-auth-feature-icon"><i className={`bi ${icon}`} /></div>
              <div><strong>{title}</strong><p>{desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="ef-auth-right">
        <div className="ef-auth-card card shadow-lg">
          <div className="card-body p-4 p-md-5">
            <h2 className="ef-auth-title">Welcome Back</h2>
            <p className="ef-auth-sub text-muted">Sign in to your dashboard</p>

            {error && <div className="alert alert-danger py-2"><i className="bi bi-exclamation-circle me-2" />{error}</div>}

            <form onSubmit={handle}>
              <div className="mb-3">
                <label className="form-label">Email address</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope" /></span>
                  <input type="email" className="form-control" placeholder="you@email.com"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock" /></span>
                  <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="••••••••"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw(!showPw)}>
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn ef-btn-primary w-100" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-box-arrow-in-right me-2" />}
                Sign In
              </button>
            </form>

            <hr className="my-4" />
            <p className="text-center mb-0">
              Don't have an account?{' '}
              <Link to="/register" className="ef-link fw-semibold">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
