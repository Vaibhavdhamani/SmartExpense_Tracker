import { useState, useMemo, useCallback } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useRecurring }  from '../hooks/useRecurring';
import { useCurrency }   from '../hooks/useCurrency';

// ─────────────────────────────────────────────────────────────
// EMI Math
// ─────────────────────────────────────────────────────────────
function calcEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  return (principal * r * Math.pow(1 + r, tenureMonths)) /
         (Math.pow(1 + r, tenureMonths) - 1);
}

function buildSchedule(principal, annualRate, tenureMonths) {
  const emi = calcEMI(principal, annualRate, tenureMonths);
  const r   = annualRate / 12 / 100;
  const rows = [];
  let balance = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const interest  = balance * r;
    const principal_ = emi - interest;
    balance -= principal_;
    if (balance < 0) balance = 0;

    const d = new Date();
    d.setMonth(d.getMonth() + i);
    rows.push({
      month:     i,
      date:      d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      emi:       emi,
      principal: principal_,
      interest:  interest,
      balance:   Math.max(balance, 0),
    });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────
// Donut Ring SVG
// ─────────────────────────────────────────────────────────────
function DonutRing({ principal, totalInterest, size = 160 }) {
  const total = principal + totalInterest;
  if (!total) return null;
  const pPct = (principal / total) * 100;
  const iPct = (totalInterest / total) * 100;

  const r   = 58, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pDash = (pPct / 100) * circ;
  const iDash = (iPct / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Principal arc */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke="#6366f1" strokeWidth="18"
        strokeDasharray={`${pDash} ${circ - pDash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="butt"
      />
      {/* Interest arc */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke="#ef4444" strokeWidth="18"
        strokeDasharray={`${iDash} ${circ - iDash}`}
        strokeDashoffset={circ * 0.25 - pDash}
        strokeLinecap="butt"
      />
      {/* Inner hole */}
      <circle cx={cx} cy={cy} r={r - 14} fill="var(--bs-body-bg)" />
      <text x={cx} y={cy - 6} textAnchor="middle"
        fontSize="10" fill="var(--bs-secondary-color)" fontFamily="sans-serif">
        Total
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        fontSize="11" fontWeight="700" fill="var(--bs-body-color)" fontFamily="sans-serif">
        ₹{Math.round(total / 1000)}K
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Add to Recurring Modal
// ─────────────────────────────────────────────────────────────
function AddRecurringModal({ emi, loanName, categories, onClose, onAdd, loading }) {
  const [form, setForm] = useState({
    description: loanName || 'EMI Payment',
    category:    '',
    frequency:   'monthly',
    dayOfMonth:  new Date().getDate(),
  });
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { setErr('Please select a category'); return; }
    if (!form.description.trim()) { setErr('Please enter a name'); return; }
    setErr('');
    await onAdd({
      description: form.description.trim(),
      category:    form.category,
      amount:      Math.round(emi),
      frequency:   'monthly',
      dayOfMonth:  parseInt(form.dayOfMonth),
      dayOfWeek:   1,
      notes:       'Added from EMI Calculator',
    });
  };

  // Loan-related categories
  const loanCats = categories.filter(c =>
    ['housing','bills','education','emi','loan','finance','other']
      .some(k => c.name?.toLowerCase().includes(k))
  );
  const displayCats = loanCats.length > 0 ? loanCats : categories;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)', zIndex: 1060,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'var(--bs-body-bg)',
        borderRadius: 20, border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '0.5px solid var(--bs-border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Add to Recurring</div>
            <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
              ₹{Math.round(emi).toLocaleString('en-IN')}/month — auto reminder set ho jayega
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--bs-secondary-color)',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 22px' }}>
          {/* EMI preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 12, marginBottom: 18,
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(99,102,241,0.12)', color: '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🏦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#6366f1' }}>
                ₹{Math.round(emi).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
                Monthly EMI — every month reminder
              </div>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em',
              textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
              display: 'block', marginBottom: 6 }}>
              Name
            </label>
            <input type="text" className="form-control" style={{ borderRadius: 10 }}
              placeholder="e.g. Home Loan EMI, Car Loan"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em',
              textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
              display: 'block', marginBottom: 6 }}>
              Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {displayCats.slice(0, 9).map(c => (
                <button key={c._id} type="button"
                  onClick={() => setForm(p => ({ ...p, category: c._id }))}
                  style={{
                    padding: '8px 4px', borderRadius: 10, textAlign: 'center',
                    border: form.category === c._id
                      ? `2px solid ${c.color}` : '1.5px solid var(--bs-border-color)',
                    background: form.category === c._id ? c.color + '15' : 'transparent',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bs-body-color)' }}>
                    {c.name?.slice(0, 8)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Day of month */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em',
              textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
              display: 'block', marginBottom: 6 }}>
              EMI Due Date (day of month)
            </label>
            <select className="form-select" style={{ borderRadius: 10 }}
              value={form.dayOfMonth}
              onChange={e => setForm(p => ({ ...p, dayOfMonth: e.target.value }))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}{
                  d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
                } of every month</option>
              ))}
            </select>
          </div>

          {err && <div className="text-danger small mb-3">{err}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn ef-btn-primary" disabled={loading}
              style={{ flex: 1 }}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Adding…</>
                : <><i className="bi bi-arrow-repeat me-2" />Add to Recurring</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Popular Loan Presets
// ─────────────────────────────────────────────────────────────
const PRESETS = [
  { icon: '🏠', label: 'Home Loan',   amount: 3000000, rate: 8.5,  tenure: 240, name: 'Home Loan EMI'   },
  { icon: '🚗', label: 'Car Loan',    amount: 800000,  rate: 9.0,  tenure: 60,  name: 'Car Loan EMI'    },
  { icon: '📱', label: 'Gadget Loan', amount: 50000,   rate: 13.0, tenure: 12,  name: 'Gadget Loan EMI' },
  { icon: '📚', label: 'Education',   amount: 500000,  rate: 10.5, tenure: 84,  name: 'Education Loan'  },
  { icon: '💼', label: 'Personal',    amount: 200000,  rate: 14.0, tenure: 36,  name: 'Personal Loan'   },
  { icon: '🏗️', label: 'Business',   amount: 1000000, rate: 12.0, tenure: 60,  name: 'Business Loan'   },
];

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function EmiCalculatorPage() {
  const { categories }         = useCategories();
  const { addRecurring, submitting } = useRecurring();
  const { format }             = useCurrency();

  const [loanAmount,    setLoanAmount]    = useState('');
  const [interestRate,  setInterestRate]  = useState('');
  const [tenureMonths,  setTenureMonths]  = useState('');
  const [tenureType,    setTenureType]    = useState('months'); // months | years
  const [loanName,      setLoanName]      = useState('');
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState('all'); // all | year1 | last
  const [added,         setAdded]         = useState(false);

  // Derived values
  const months = useMemo(() => {
    const t = parseFloat(tenureMonths);
    return tenureType === 'years' ? Math.round(t * 12) : Math.round(t);
  }, [tenureMonths, tenureType]);

  const emi          = useMemo(() => calcEMI(parseFloat(loanAmount), parseFloat(interestRate), months), [loanAmount, interestRate, months]);
  const totalPayment = useMemo(() => emi * months, [emi, months]);
  const totalInterest= useMemo(() => totalPayment - parseFloat(loanAmount || 0), [totalPayment, loanAmount]);
  const schedule     = useMemo(() => {
    if (!emi || !months) return [];
    return buildSchedule(parseFloat(loanAmount), parseFloat(interestRate), months);
  }, [loanAmount, interestRate, months, emi]);

  const isValid = emi > 0 && !isNaN(emi);

  const applyPreset = (p) => {
    setLoanAmount(String(p.amount));
    setInterestRate(String(p.rate));
    setTenureMonths(String(p.tenure));
    setTenureType('months');
    setLoanName(p.name);
    setShowSchedule(false);
    setAdded(false);
  };

  const handleAddRecurring = async (payload) => {
    const ok = await addRecurring(payload);
    if (ok) {
      setShowAddModal(false);
      setAdded(true);
    }
  };

  // Schedule filter
  const visibleSchedule = useMemo(() => {
    if (scheduleFilter === 'year1') return schedule.slice(0, 12);
    if (scheduleFilter === 'last')  return schedule.slice(-12);
    return schedule;
  }, [schedule, scheduleFilter]);

  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="ef-page">

      {/* ── Header ── */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">EMI Calculator</h4>
          <p className="text-muted small mb-0">
            Loan EMI calculate karo · Amortization schedule · Add to Recurring
          </p>
        </div>
      </div>

      {/* ── Loan Presets ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.07em',
          textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
          marginBottom: 10,
        }}>
          Quick Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}
          className="ef-preset-grid">
          {PRESETS.map((p, i) => (
            <button key={i} type="button" onClick={() => applyPreset(p)}
              style={{
                padding: '10px 8px', borderRadius: 12, textAlign: 'center',
                border: loanName === p.name
                  ? '2px solid var(--bs-primary)'
                  : '0.5px solid var(--bs-border-color)',
                background: loanName === p.name
                  ? 'rgba(99,102,241,0.06)' : 'var(--bs-body-bg)',
                cursor: 'pointer', transition: 'all .15s',
              }}>
              <div style={{ fontSize: 22, marginBottom: 3 }}>{p.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bs-body-color)' }}>
                {p.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginTop: 1 }}>
                {p.rate}% · {p.tenure}m
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}
        className="ef-emi-grid">

        {/* LEFT — Input form */}
        <div style={{
          background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)',
          borderRadius: 16, padding: '20px',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>
            <i className="bi bi-calculator me-2 text-primary" />
            Loan Details
          </div>

          {/* Loan Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>Loan Name</label>
            <input type="text" className="form-control" style={{ borderRadius: 10 }}
              placeholder="e.g. Home Loan, Car EMI"
              value={loanName}
              onChange={e => setLoanName(e.target.value)}
            />
          </div>

          {/* Loan Amount */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>Loan Amount (₹)</label>
            <div className="input-group">
              <span className="input-group-text" style={{ fontWeight: 700, fontSize: 16 }}>₹</span>
              <input type="number" min="1000" step="1000"
                className="form-control" style={{ fontSize: 16, fontWeight: 700 }}
                placeholder="e.g. 1000000"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
              />
            </div>
            {loanAmount && (
              <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 4 }}>
                {fmt(parseFloat(loanAmount) || 0)}
              </div>
            )}
          </div>

          {/* Interest Rate */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>Annual Interest Rate (%)</label>
            <div className="input-group">
              <input type="number" min="1" max="40" step="0.1"
                className="form-control"
                placeholder="e.g. 8.5"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
              />
              <span className="input-group-text" style={{ fontWeight: 700 }}>%</span>
            </div>
          </div>

          {/* Tenure */}
          <div style={{ marginBottom: 20 }}>
            <label style={lblStyle}>Loan Tenure</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="1" max={tenureType === 'years' ? 30 : 360} step="1"
                className="form-control"
                placeholder={tenureType === 'years' ? 'e.g. 20' : 'e.g. 240'}
                value={tenureMonths}
                onChange={e => setTenureMonths(e.target.value)}
              />
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bs-border-color)', flexShrink: 0 }}>
                {['months','years'].map(t => (
                  <button key={t} type="button" onClick={() => setTenureType(t)}
                    style={{
                      padding: '0 14px', border: 'none', cursor: 'pointer',
                      background: tenureType === t ? 'var(--bs-primary)' : 'transparent',
                      color: tenureType === t ? '#fff' : 'var(--bs-secondary-color)',
                      fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {months > 0 && tenureType === 'years' && (
              <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 4 }}>
                = {months} months
              </div>
            )}
          </div>

          {/* Slider for interest rate */}
          {interestRate && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--bs-secondary-color)' }}>Rate: {interestRate}%</span>
                <span style={{ color: 'var(--bs-secondary-color)' }}>Drag to adjust</span>
              </div>
              <input type="range" className="form-range" min="1" max="30" step="0.1"
                value={parseFloat(interestRate) || 1}
                onChange={e => setInterestRate(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--bs-secondary-color)' }}>
                <span>1%</span><span>30%</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isValid && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button className="btn ef-btn-primary" style={{ borderRadius: 10 }}
                onClick={() => setShowSchedule(s => !s)}>
                <i className={`bi ${showSchedule ? 'bi-eye-slash' : 'bi-table'} me-2`} />
                {showSchedule ? 'Hide Schedule' : 'View Amortization Schedule'}
              </button>
              <button
                className="btn"
                style={{
                  borderRadius: 10, fontWeight: 600,
                  background: added ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                  color: added ? '#16a34a' : '#6366f1',
                  border: `1px solid ${added ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                }}
                onClick={() => !added && setShowAddModal(true)}
              >
                {added
                  ? <><i className="bi bi-check-circle-fill me-2" />Added to Recurring!</>
                  : <><i className="bi bi-arrow-repeat me-2" />Add EMI to Recurring</>}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {!isValid ? (
            <div style={{
              background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)',
              borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                Enter loan details to calculate
              </div>
              <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                Or pick a preset above to get started instantly
              </div>
            </div>
          ) : (
            <>
              {/* EMI Hero Card */}
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '1.5px solid rgba(99,102,241,0.35)',
                borderRadius: 16, padding: '20px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 4 }}>
                  Monthly EMI
                </div>
                <div style={{ fontWeight: 800, fontSize: 34, color: '#6366f1', marginBottom: 4 }}>
                  {fmt(emi)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
                  per month for {months} months
                </div>
              </div>

              {/* Donut + stats */}
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 16, padding: '20px',
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <DonutRing
                    principal={parseFloat(loanAmount)}
                    totalInterest={totalInterest}
                    size={150}
                  />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {[
                      { label: 'Principal', val: fmt(parseFloat(loanAmount)), color: '#6366f1', dot: '#6366f1' },
                      { label: 'Total Interest', val: fmt(totalInterest),     color: '#ef4444', dot: '#ef4444' },
                      { label: 'Total Payment',  val: fmt(totalPayment),      color: 'var(--bs-body-color)', dot: '#94a3b8' },
                    ].map(({ label, val, color, dot }) => (
                      <div key={label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                          <span style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>{label}</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color }}>{val}</div>
                      </div>
                    ))}

                    {/* Interest burden */}
                    <div style={{
                      marginTop: 4, padding: '6px 10px', borderRadius: 8,
                      background: totalInterest / totalPayment > 0.4
                        ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                      border: `1px solid ${totalInterest / totalPayment > 0.4
                        ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700,
                        color: totalInterest / totalPayment > 0.4 ? '#dc2626' : '#16a34a' }}>
                        Interest burden: {Math.round((totalInterest / totalPayment) * 100)}%
                        {totalInterest / totalPayment > 0.4 ? ' — High!' : ' — Reasonable'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  {
                    icon: 'bi-calendar-month', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
                    label: 'Tenure', val: `${months} months`,
                    sub: months >= 12 ? `${Math.round(months / 12 * 10) / 10} years` : null,
                  },
                  {
                    icon: 'bi-percent', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
                    label: 'Interest Rate', val: `${interestRate}% p.a.`,
                    sub: `${(parseFloat(interestRate) / 12).toFixed(2)}% per month`,
                  },
                  {
                    icon: 'bi-calendar-check', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
                    label: 'Payoff Date',
                    val: (() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + months);
                      return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                    })(),
                    sub: 'Estimated completion',
                  },
                  {
                    icon: 'bi-cash-stack', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
                    label: 'Extra vs Principal',
                    val: `+${Math.round((totalInterest / parseFloat(loanAmount)) * 100)}%`,
                    sub: 'Interest overhead',
                  },
                ].map(({ icon, color, bg, label, val, sub }) => (
                  <div key={label} style={{
                    background: 'var(--bs-body-bg)',
                    border: '0.5px solid var(--bs-border-color)',
                    borderRadius: 12, padding: '12px 14px',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, background: bg, color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, marginBottom: 8,
                    }}>
                      <i className={`bi ${icon}`} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, color }}>
                      {val}
                    </div>
                    {sub && (
                      <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginTop: 1 }}>
                        {sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Rate comparison tips */}
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 14, padding: '14px 16px',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  <i className="bi bi-lightbulb me-2" style={{ color: '#f59e0b' }} />
                  Rate Comparison
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[-1, 0, 1].map(delta => {
                    const r       = parseFloat(interestRate) + delta;
                    if (r <= 0 || r > 30) return null;
                    const e2      = calcEMI(parseFloat(loanAmount), r, months);
                    const isMain  = delta === 0;
                    const saving  = Math.abs((emi - e2) * months);
                    return (
                      <div key={delta} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', borderRadius: 8,
                        background: isMain ? 'rgba(99,102,241,0.08)' : 'transparent',
                        border: isMain ? '1px solid rgba(99,102,241,0.2)' : '0.5px solid var(--bs-border-color)',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: isMain ? 700 : 400 }}>
                          {r.toFixed(1)}% {isMain ? '← current' : delta < 0 ? '(-1%)' : '(+1%)'}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: isMain ? '#6366f1' : 'var(--bs-body-color)' }}>
                            {fmt(e2)}/mo
                          </div>
                          {!isMain && (
                            <div style={{ fontSize: 10, color: delta < 0 ? '#16a34a' : '#dc2626' }}>
                              {delta < 0 ? 'Save' : 'Extra'} {fmt(saving)} total
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Amortization Schedule ── */}
      {showSchedule && isValid && (
        <div style={{
          marginTop: 20, background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {/* Schedule header */}
          <div style={{
            padding: '16px 20px', borderBottom: '0.5px solid var(--bs-border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                <i className="bi bi-table me-2 text-primary" />
                Amortization Schedule
              </div>
              <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
                {months} payments · {loanName || 'Loan'}
              </div>
            </div>
            {/* Filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { val: 'all',   label: `All (${months})` },
                { val: 'year1', label: 'Year 1' },
                { val: 'last',  label: 'Last 12' },
              ].map(f => (
                <button key={f.val} type="button"
                  onClick={() => setScheduleFilter(f.val)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    border: scheduleFilter === f.val
                      ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
                    background: scheduleFilter === f.val ? 'var(--bs-primary)' : 'transparent',
                    color: scheduleFilter === f.val ? '#fff' : 'var(--bs-secondary-color)',
                    cursor: 'pointer',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bs-secondary-bg, rgba(0,0,0,0.04))' }}>
                  {['#', 'Date', 'EMI', 'Principal', 'Interest', 'Balance', 'Paid %'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: h === '#' || h === 'Paid %' ? 'center' : 'right',
                      fontWeight: 700, fontSize: 11, color: 'var(--bs-secondary-color)',
                      letterSpacing: '.05em', textTransform: 'uppercase',
                      borderBottom: '0.5px solid var(--bs-border-color)',
                    }}>
                      {h === '#' ? '' : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSchedule.map((row, i) => {
                  const paidPct = Math.round(((parseFloat(loanAmount) - row.balance) / parseFloat(loanAmount)) * 100);
                  const isLast  = row.balance === 0;
                  return (
                    <tr key={row.month} style={{
                      background: isLast
                        ? 'rgba(34,197,94,0.04)'
                        : i % 2 === 0 ? 'transparent' : 'var(--bs-secondary-bg, rgba(0,0,0,0.02))',
                      borderBottom: '0.5px solid var(--bs-border-color)',
                    }}>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: 'var(--bs-secondary-color)', fontSize: 11 }}>
                        {row.month}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--bs-secondary-color)' }}>
                        {row.date}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
                        {fmt(row.emi)}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>
                        {fmt(row.principal)}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: '#ef4444' }}>
                        {fmt(row.interest)}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {isLast ? (
                          <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>✓ Paid Off</span>
                        ) : fmt(row.balance)}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 5, background: 'var(--bs-border-color)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 5,
                              background: paidPct > 75 ? '#22c55e' : paidPct > 40 ? '#6366f1' : '#f59e0b',
                              width: `${paidPct}%`,
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--bs-secondary-color)', minWidth: 26 }}>
                            {paidPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr style={{ background: 'var(--bs-secondary-bg, rgba(0,0,0,0.04))', borderTop: '1.5px solid var(--bs-border-color)' }}>
                  <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12 }}>
                    TOTAL
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#6366f1' }}>
                    {fmt(totalPayment)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                    {fmt(parseFloat(loanAmount))}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                    {fmt(totalInterest)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add to Recurring Modal */}
      {showAddModal && (
        <AddRecurringModal
          emi={emi}
          loanName={loanName}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddRecurring}
          loading={submitting}
        />
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 600px) {
          .ef-emi-grid { grid-template-columns: 1fr !important; }
          .ef-preset-grid { grid-template-columns: repeat(3,1fr) !important; }
        }
        @media (min-width: 768px) {
          .ef-preset-grid { grid-template-columns: repeat(6,1fr) !important; }
        }
      `}</style>
    </div>
  );
}

const lblStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.07em',
  textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
  marginBottom: 6, display: 'block',
};