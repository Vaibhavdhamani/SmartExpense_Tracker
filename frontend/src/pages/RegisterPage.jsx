import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6)       return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await register(form.username, form.email, form.password);
      if (!res.success) setError(res.error || 'Registration failed');
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
          <p>Start tracking smarter today</p>
        </div>
      </div>

      <div className="ef-auth-right">
        <div className="ef-auth-card card shadow-lg">
          <div className="card-body p-4 p-md-5">
            <h2 className="ef-auth-title">Create Account</h2>
            <p className="ef-auth-sub text-muted">Join thousands of smart spenders</p>

            {error && <div className="alert alert-danger py-2"><i className="bi bi-exclamation-circle me-2" />{error}</div>}

            <form onSubmit={handle}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-person" /></span>
                  <input type="text" className="form-control" placeholder="yourname"
                    value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    required minLength={3} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope" /></span>
                  <input type="email" className="form-control" placeholder="you@email.com"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock" /></span>
                  <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Min 6 characters"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required minLength={6} />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw(!showPw)}>
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Confirm Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock-fill" /></span>
                  <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Repeat password"
                    value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>

              <button type="submit" className="btn ef-btn-primary w-100" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-person-plus me-2" />}
                Create Account
              </button>
            </form>

            <hr className="my-4" />
            <p className="text-center mb-0">
              Already have an account? <Link to="/login" className="ef-link fw-semibold">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
