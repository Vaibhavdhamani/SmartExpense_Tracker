import { useState } from 'react';
import { useGoals }   from '../hooks/useGoals';
import { useSalary }  from '../hooks/useSalary';
import { useCurrency } from '../hooks/useCurrency';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const GOAL_CATEGORIES = [
  { val: 'emergency', label: 'Emergency Fund', icon: '🚨', color: '#ef4444' },
  { val: 'vacation',  label: 'Vacation',        icon: '✈️', color: '#06b6d4' },
  { val: 'gadget',    label: 'Gadget / Tech',   icon: '📱', color: '#8b5cf6' },
  { val: 'vehicle',   label: 'Vehicle',         icon: '🚗', color: '#f59e0b' },
  { val: 'home',      label: 'Home / Property', icon: '🏠', color: '#10b981' },
  { val: 'education', label: 'Education',       icon: '📚', color: '#6366f1' },
  { val: 'wedding',   label: 'Wedding',         icon: '💍', color: '#ec4899' },
  { val: 'health',    label: 'Health',          icon: '🏥', color: '#14b8a6' },
  { val: 'other',     label: 'Other',           icon: '🎯', color: '#64748b' },
];

const COLOR_PRESETS = [
  '#ef4444','#f59e0b','#22c55e','#06b6d4',
  '#6366f1','#ec4899','#8b5cf6','#14b8a6','#64748b',
];

function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function monthsToGoal(remaining, monthlySavings) {
  if (!monthlySavings || monthlySavings <= 0) return null;
  return Math.ceil(remaining / monthlySavings);
}

// ─────────────────────────────────────────────────────────────
// Goal Form Modal
// ─────────────────────────────────────────────────────────────
function GoalFormModal({ goal, onClose, onSubmit, loading }) {
  const isEdit = !!goal;
  const cat = GOAL_CATEGORIES.find(c => c.val === goal?.category) || GOAL_CATEGORIES[0];

  const [form, setForm] = useState({
    title:        goal?.title        || '',
    description:  goal?.description  || '',
    icon:         goal?.icon         || cat.icon,
    color:        goal?.color        || cat.color,
    targetAmount: goal?.targetAmount || '',
    savedAmount:  goal?.savedAmount  || '',
    targetDate:   goal?.targetDate   ? new Date(goal.targetDate).toISOString().slice(0,10) : '',
    category:     goal?.category     || 'other',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const pickCategory = (c) => {
    setForm(p => ({ ...p, category: c.val, icon: c.icon, color: c.color }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())                           e.title        = 'Title dalo';
    if (!form.targetAmount || +form.targetAmount <= 0) e.targetAmount = 'Valid target amount dalo';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      title:        form.title.trim(),
      description:  form.description.trim(),
      icon:         form.icon,
      color:        form.color,
      targetAmount: parseFloat(form.targetAmount),
      savedAmount:  form.savedAmount ? parseFloat(form.savedAmount) : 0,
      targetDate:   form.targetDate || null,
      category:     form.category,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 1050, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bs-body-bg)',
        borderRadius: 20, border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px', flexShrink: 0,
          borderBottom: '0.5px solid var(--bs-border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {isEdit ? 'Edit Goal' : 'New Savings Goal'}
            </h5>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--bs-secondary-color)' }}>
              {isEdit ? 'Goal details update karo' : 'Financial target set karo'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--bs-secondary-color)', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px' }}>

            {/* Category picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {GOAL_CATEGORIES.map(c => (
                  <button
                    key={c.val} type="button"
                    onClick={() => pickCategory(c)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                      border: form.category === c.val
                        ? `2px solid ${c.color}`
                        : '1.5px solid var(--bs-border-color)',
                      background: form.category === c.val ? c.color + '15' : 'transparent',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bs-body-color)' }}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Goal Title *</div>
              <input
                type="text"
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                style={{ borderRadius: 10 }}
                placeholder="e.g. Emergency Fund, Goa Trip, iPhone 16"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
              {errors.title && <div className="text-danger small mt-1">{errors.title}</div>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(optional)</span></div>
              <textarea
                className="form-control"
                style={{ borderRadius: 10, fontSize: 14 }}
                rows={2}
                placeholder="Goal ke baare mein kuch likhein…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Target amount */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Target Amount (₹) *</div>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number" min="1" step="1000" placeholder="e.g. 100000"
                  className={`form-control ${errors.targetAmount ? 'is-invalid' : ''}`}
                  value={form.targetAmount}
                  onChange={e => set('targetAmount', e.target.value)}
                />
              </div>
              {errors.targetAmount && <div className="text-danger small mt-1">{errors.targetAmount}</div>}
            </div>

            {/* Already saved */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Already Saved (₹) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(optional)</span></div>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number" min="0" step="100" placeholder="0"
                  className="form-control"
                  value={form.savedAmount}
                  onChange={e => set('savedAmount', e.target.value)}
                />
              </div>
              <small className="text-muted">Agar pehle se kuch save kar rakha hai toh yahan daalo</small>
            </div>

            {/* Target date */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Target Date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(optional)</span></div>
              <input
                type="date" className="form-control" style={{ borderRadius: 10 }}
                value={form.targetDate}
                min={new Date().toISOString().slice(0,10)}
                onChange={e => set('targetDate', e.target.value)}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 8 }}>
              <div style={labelStyle}>Color</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => set('color', c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c, border: 'none', cursor: 'pointer',
                      outline: form.color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 2, transition: 'all .12s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 22px', flexShrink: 0,
            borderTop: '0.5px solid var(--bs-border-color)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            background: 'var(--bs-body-bg)',
          }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn ef-btn-primary" disabled={loading} style={{ minWidth: 140 }}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                : <><i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-plus-lg'} me-2`} />{isEdit ? 'Update Goal' : 'Create Goal'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Deposit / Withdraw Modal
// ─────────────────────────────────────────────────────────────
function TransactionModal({ goal, mode, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState('');
  const [error,  setError]  = useState('');
  const isDeposit = mode === 'deposit';
  const max = isDeposit ? (goal.targetAmount - goal.savedAmount) : goal.savedAmount;

  const quickAmounts = [500, 1000, 2000, 5000, 10000].filter(a => a <= max);

  const handle = (ev) => {
    ev.preventDefault();
    if (!amount || +amount <= 0) { setError('Valid amount dalo'); return; }
    if (+amount > max) { setError(`Maximum ${max.toLocaleString('en-IN')} ₹ ${isDeposit ? 'add' : 'withdraw'} kar sakte ho`); return; }
    onSubmit(parseFloat(amount));
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 1060, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bs-body-bg)',
        borderRadius: 20, border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '0.5px solid var(--bs-border-color)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, fontSize: 20,
            background: goal.color + '20', color: goal.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{goal.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {isDeposit ? 'Paise Add Karo' : 'Paise Nikalo'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{goal.title}</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--bs-secondary-color)', lineHeight: 1,
          }}>×</button>
        </div>

        <form onSubmit={handle} style={{ padding: '16px 20px' }}>
          {/* Current progress */}
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'var(--bs-secondary-bg, rgba(0,0,0,0.04))',
            display: 'flex', justifyContent: 'space-between', fontSize: 13,
          }}>
            <span className="text-muted">Abhi saved</span>
            <span style={{ fontWeight: 700 }}>₹{goal.savedAmount?.toLocaleString('en-IN')}</span>
            <span className="text-muted">of ₹{goal.targetAmount?.toLocaleString('en-IN')}</span>
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Amount (₹)</div>
            <div className="input-group">
              <span className="input-group-text">₹</span>
              <input
                type="number" min="1" step="1" placeholder="0"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                autoFocus
              />
            </div>
            {error && <div className="text-danger small mt-1">{error}</div>}
          </div>

          {/* Quick amounts */}
          {quickAmounts.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {quickAmounts.map(a => (
                <button
                  key={a} type="button"
                  onClick={() => setAmount(a.toString())}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: amount == a ? `2px solid ${goal.color}` : '1px solid var(--bs-border-color)',
                    background: amount == a ? goal.color + '18' : 'transparent',
                    color: 'var(--bs-body-color)', cursor: 'pointer',
                  }}
                >
                  ₹{a >= 1000 ? `${a/1000}K` : a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(max.toString())}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: '1px dashed var(--bs-border-color)',
                  background: 'transparent', color: 'var(--bs-secondary-color)', cursor: 'pointer',
                }}
              >Max</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                flex: 2, borderRadius: 10, fontWeight: 600,
                background: isDeposit ? '#22c55e' : '#ef4444',
                color: '#fff', border: 'none',
              }}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm" />
                : <><i className={`bi ${isDeposit ? 'bi-plus-lg' : 'bi-dash-lg'} me-1`} />
                  {isDeposit ? 'Add Karo' : 'Nikalo'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Goal Card
// ─────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onDelete, onDeposit, onWithdraw }) {
  const pct    = goal.progressPct ?? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
  const dl     = daysLeft(goal.targetDate);
  const isDone = goal.isCompleted;

  return (
    <div style={{
      background: 'var(--bs-body-bg)',
      border: isDone
        ? '1.5px solid rgba(34,197,94,0.4)'
        : '0.5px solid var(--bs-border-color)',
      borderRadius: 16, padding: '18px 20px',
      display: 'flex', flexDirection: 'column',
      height: '100%', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Completed ribbon */}
      {isDone && (
        <div style={{
          position: 'absolute', top: 12, right: -20,
          background: '#22c55e', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '3px 28px',
          transform: 'rotate(35deg)', letterSpacing: '0.05em',
        }}>DONE ✓</div>
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: goal.color + '20', fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{goal.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }} className="text-truncate">
            {goal.title}
          </div>
          {goal.description && (
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 2 }} className="text-truncate">
              {goal.description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}
            onClick={() => onEdit(goal)} title="Edit">
            <i className="bi bi-pencil" />
          </button>
          <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
            onClick={() => onDelete(goal._id)} title="Delete">
            <i className="bi bi-trash" />
          </button>
        </div>
      </div>

      {/* Amount display */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: goal.color }}>
              ₹{goal.savedAmount?.toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginLeft: 6 }}>
              of ₹{goal.targetAmount?.toLocaleString('en-IN')}
            </span>
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: isDone ? '#22c55e' : pct >= 75 ? '#f59e0b' : 'var(--bs-secondary-color)',
          }}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 10, borderRadius: 10, background: 'var(--bs-border-color)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 10,
            background: isDone ? '#22c55e' : goal.color,
            width: `${pct}%`,
            transition: 'width .4s ease',
          }} />
        </div>
      </div>

      {/* Remaining + deadline */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {!isDone && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
          }}>
            ₹{(goal.targetAmount - goal.savedAmount).toLocaleString('en-IN')} baki
          </span>
        )}
        {dl !== null && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: dl < 0 ? 'rgba(239,68,68,0.1)' : dl < 30 ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
            color:      dl < 0 ? '#ef4444'              : dl < 30 ? '#d97706'              : '#6366f1',
          }}>
            <i className="bi bi-calendar3 me-1" style={{ fontSize: 10 }} />
            {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Aaj deadline' : `${dl}d baki`}
          </span>
        )}
        {isDone && goal.completedAt && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(34,197,94,0.1)', color: '#16a34a',
          }}>
            <i className="bi bi-check-circle-fill me-1" style={{ fontSize: 10 }} />
            {new Date(goal.completedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        )}
      </div>

      {/* Action buttons */}
      {!isDone && (
        <div style={{
          marginTop: 'auto', paddingTop: 12,
          borderTop: '0.5px solid var(--bs-border-color)',
          display: 'flex', gap: 8,
        }}>
          <button
            className="btn btn-sm"
            style={{
              flex: 2, borderRadius: 8, fontWeight: 600,
              background: '#22c55e', color: '#fff', border: 'none',
            }}
            onClick={() => onDeposit(goal)}
          >
            <i className="bi bi-plus-lg me-1" />Add Money
          </button>
          {goal.savedAmount > 0 && (
            <button
              className="btn btn-sm btn-outline-secondary"
              style={{ flex: 1, borderRadius: 8 }}
              onClick={() => onWithdraw(goal)}
            >
              <i className="bi bi-dash-lg me-1" />Withdraw
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div style={{
          marginTop: 'auto', paddingTop: 12,
          borderTop: '0.5px solid var(--bs-border-color)',
          textAlign: 'center', fontSize: 13,
          color: '#22c55e', fontWeight: 600,
        }}>
          🎉 Goal Complete Ho Gaya!
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper styles
// ─────────────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
  marginBottom: 8, display: 'block',
};

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const {
    goals, summary, loading, submitting,
    addGoal, updateGoal, deleteGoal, deposit, withdraw,
  } = useGoals();

  const { salary, hasSalary } = useSalary();
  const { format }            = useCurrency();

  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [depositing, setDepositing] = useState(null); // { goal, mode }
  const [filter,     setFilter]     = useState('active'); // active | completed | all

  const handleFormSubmit = async (payload) => {
    const ok = editing
      ? await updateGoal(editing._id, payload)
      : await addGoal(payload);
    if (ok) { setShowForm(false); setEditing(null); }
  };

  const handleDeposit = async (amount) => {
    if (!depositing) return;
    const ok = await deposit(depositing.goal._id, amount, depositing.goal.title);
    if (ok) setDepositing(null);
  };

  const handleWithdraw = async (amount) => {
    if (!depositing) return;
    const ok = await withdraw(depositing.goal._id, amount);
    if (ok) setDepositing(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Is goal ko delete karein?')) deleteGoal(id);
  };

  const filteredGoals = goals.filter(g => {
    if (filter === 'active')    return !g.isCompleted;
    if (filter === 'completed') return  g.isCompleted;
    return true;
  });

  // Monthly savings needed per active goal
  const activeMonthlySavings = hasSalary && summary
    ? (() => {
        const totalRemaining = summary.totalTarget - summary.totalSaved;
        return totalRemaining > 0 ? Math.ceil(totalRemaining / 12) : 0;
      })()
    : null;

  return (
    <div className="ef-page">

      {/* ── Header ── */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Savings Goals</h4>
          <p className="text-muted small mb-0">
            {goals.filter(g => !g.isCompleted).length} active goal
            {goals.filter(g => !g.isCompleted).length !== 1 ? 's' : ''}
            {goals.filter(g => g.isCompleted).length > 0 && (
              <span className="ms-2 text-success">
                · {goals.filter(g => g.isCompleted).length} completed ✓
              </span>
            )}
          </p>
        </div>
        <button
          className="btn ef-btn-primary"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">New Goal</span>
          <span className="d-sm-none">Add</span>
        </button>
      </div>

      {/* ── Summary cards ── */}
      {summary && goals.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            {
              icon: 'bi-bullseye', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
              label: 'Total Target', val: `₹${summary.totalTarget?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-piggy-bank', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
              label: 'Total Saved', val: `₹${summary.totalSaved?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-arrow-right-circle', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
              label: 'Still Needed', val: `₹${summary.totalRemaining?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-trophy', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',
              label: 'Completed', val: summary.completedCount || 0,
            },
          ].map(({ icon, color, bg, label, val }) => (
            <div className="col-6 col-md-3" key={label}>
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 14, padding: 16,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: bg,
                  color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: 10, fontSize: 17,
                }}>
                  <i className={`bi ${icon}`} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Salary insight ── */}
      {hasSalary && summary && summary.totalRemaining > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 14,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 24 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Salary se goal track</div>
            <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
              Salary ₹{salary?.toLocaleString('en-IN')}/month — sabhi goals complete karne ke liye
              {' '}<strong style={{ color: '#6366f1' }}>₹{activeMonthlySavings?.toLocaleString('en-IN')}/month</strong> save karna hoga
            </div>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 20,
            background: activeMonthlySavings <= salary * 0.3 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: activeMonthlySavings <= salary * 0.3 ? '#16a34a' : '#ef4444',
            fontSize: 12, fontWeight: 700,
          }}>
            {activeMonthlySavings <= salary * 0.3 ? '✅ Achievable' : '⚠️ Tough — goals kam karo'}
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      {goals.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          borderBottom: '0.5px solid var(--bs-border-color)', paddingBottom: 12,
        }}>
          {[
            { val: 'active',    label: `Active (${goals.filter(g=>!g.isCompleted).length})` },
            { val: 'completed', label: `Completed (${goals.filter(g=>g.isCompleted).length})` },
            { val: 'all',       label: `All (${goals.length})` },
          ].map(t => (
            <button key={t.val} type="button" onClick={() => setFilter(t.val)} style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: filter === t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
              background: filter === t.val ? 'var(--bs-primary)' : 'transparent',
              color: filter === t.val ? '#fff' : 'var(--bs-secondary-color)',
              cursor: 'pointer', transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ── Goals grid ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: 40, height: 40 }} />
          <p className="text-muted mt-3">Load ho raha hai…</p>
        </div>
      ) : goals.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Koi savings goal nahi</h5>
          <p className="text-muted" style={{ maxWidth: 320, margin: '0 auto 20px' }}>
            Emergency fund, vacation, gadget — pehla goal set karo aur savings track karo
          </p>
          <button
            className="btn ef-btn-primary"
            style={{ borderRadius: 10, padding: '10px 24px' }}
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-lg me-2" />Pehla Goal Banao
          </button>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-filter-circle fs-2 d-block mb-2" />
          Is filter mein koi goal nahi
        </div>
      ) : (
        <div className="row g-3">
          {filteredGoals.map(goal => (
            <div className="col-12 col-md-6 col-lg-4" key={goal._id}>
              <GoalCard
                goal={goal}
                onEdit={g => { setEditing(g); setShowForm(true); }}
                onDelete={handleDelete}
                onDeposit={g => setDepositing({ goal: g, mode: 'deposit' })}
                onWithdraw={g => setDepositing({ goal: g, mode: 'withdraw' })}
              />
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <GoalFormModal
          goal={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleFormSubmit}
          loading={submitting}
        />
      )}

      {/* Deposit/Withdraw modal */}
      {depositing && (
        <TransactionModal
          goal={depositing.goal}
          mode={depositing.mode}
          onClose={() => setDepositing(null)}
          onSubmit={depositing.mode === 'deposit' ? handleDeposit : handleWithdraw}
          loading={submitting}
        />
      )}
    </div>
  );
}