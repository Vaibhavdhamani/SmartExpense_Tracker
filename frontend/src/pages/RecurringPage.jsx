import { useState, useEffect, useRef } from 'react';
import { useRecurring }  from '../hooks/useRecurring';
import { useCategories } from '../hooks/useCategories';
import { useCurrency }   from '../hooks/useCurrency';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const FREQ = [
  { val: 'daily',   label: 'Daily',   icon: 'bi-sun',            desc: 'Har roz' },
  { val: 'weekly',  label: 'Weekly',  icon: 'bi-calendar-week',  desc: 'Har hafte' },
  { val: 'monthly', label: 'Monthly', icon: 'bi-calendar-month', desc: 'Har mahine' },
  { val: 'yearly',  label: 'Yearly',  icon: 'bi-calendar-event', desc: 'Har saal' },
];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysAhead(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function dueBadge(dateStr) {
  const d = daysAhead(dateStr);
  if (d === null) return null;
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, color: '#ef4444' };
  if (d === 0) return { label: 'Due today',  color: '#f59e0b' };
  if (d === 1) return { label: 'Due tomorrow', color: '#f59e0b' };
  if (d <= 7)  return { label: `${d}d left`,  color: '#6366f1' };
  return { label: `${d} days`,  color: '#64748b' };
}

// ─────────────────────────────────────────────────────────────
// Inline styles — design system
// ─────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
  },
  formOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: 1049,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  },
  formBox: {
    width: '100%', maxWidth: 540,
    maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bs-body-bg)',
    borderRadius: 20,
    border: '0.5px solid var(--bs-border-color)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
    overflow: 'hidden',
  },
  formHeader: {
    padding: '20px 24px 16px',
    borderBottom: '0.5px solid var(--bs-border-color)',
    flexShrink: 0,
    background: 'var(--bs-body-bg)',
  },
  formBody: {
    overflowY: 'auto',
    flex: 1,
    padding: '20px 24px',
  },
  formFooter: {
    padding: '14px 24px',
    borderTop: '0.5px solid var(--bs-border-color)',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    flexShrink: 0,
    background: 'var(--bs-body-bg)',
  },
  label: {
    fontSize: 13, fontWeight: 600,
    color: 'var(--bs-body-color)',
    marginBottom: 8, display: 'block',
    letterSpacing: '0.02em',
  },
  sectionDivider: {
    margin: '20px 0 16px',
    paddingBottom: 10,
    borderBottom: '0.5px solid var(--bs-border-color)',
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--bs-secondary-color)',
  },
  freqBtn: (active) => ({
    flex: 1, padding: '10px 8px',
    borderRadius: 10,
    border: active ? '2px solid var(--bs-primary)' : '1.5px solid var(--bs-border-color)',
    background: active ? 'var(--bs-primary)' : 'var(--bs-body-bg)',
    color: active ? '#fff' : 'var(--bs-body-color)',
    cursor: 'pointer', transition: 'all .15s',
    textAlign: 'center', fontSize: 12, fontWeight: 600,
  }),
  dayBtn: (active) => ({
    width: 36, height: 36, borderRadius: '50%',
    border: active ? '2px solid var(--bs-primary)' : '1.5px solid var(--bs-border-color)',
    background: active ? 'var(--bs-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--bs-secondary-color)',
    cursor: 'pointer', transition: 'all .15s',
    fontSize: 12, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  dateBtn: (active) => ({
    width: 36, height: 32, borderRadius: 8,
    border: active ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
    background: active ? 'var(--bs-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--bs-secondary-color)',
    cursor: 'pointer', transition: 'all .12s',
    fontSize: 12, fontWeight: 500,
  }),
  amtInput: {
    width: '100%', padding: '12px 16px 12px 42px',
    borderRadius: 10, fontSize: 18, fontWeight: 700,
    border: '1.5px solid var(--bs-border-color)',
    background: 'var(--bs-body-bg)',
    color: 'var(--bs-body-color)',
    outline: 'none', transition: 'border .15s',
  },
  card: (isDue, isInactive) => ({
    background: 'var(--bs-body-bg)',
    borderRadius: 16,
    border: isDue
      ? '1.5px solid rgba(245,158,11,0.5)'
      : '0.5px solid var(--bs-border-color)',
    padding: '18px 20px',
    opacity: isInactive ? 0.55 : 1,
    transition: 'opacity .2s, box-shadow .2s',
    height: '100%',
    display: 'flex', flexDirection: 'column',
    cursor: 'default',
  }),
  iconBubble: (color) => ({
    width: 44, height: 44, borderRadius: 12,
    background: color + '22',
    color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0,
  }),
  duePill: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: color + '18',
    color: color,
    borderRadius: 20, padding: '3px 10px',
    fontSize: 11, fontWeight: 600,
  }),
  confirmBox: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1060,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '100%', maxWidth: 400,
    background: 'var(--bs-body-bg)',
    borderRadius: 20,
    border: '0.5px solid var(--bs-border-color)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
    padding: 28,
  },
};

// ─────────────────────────────────────────────────────────────
// Category Selector
// ─────────────────────────────────────────────────────────────
function CategoryPicker({ categories, value, onChange, error }) {
  return (
    <div>
      <div className="ef-cat-grid">
        {categories.map(cat => (
          <button
            type="button"
            key={cat._id}
            className={`ef-cat-btn ${value === cat._id ? 'ef-cat-btn--active' : ''}`}
            style={{ '--cat-color': cat.color }}
            onClick={() => onChange(cat._id)}
          >
            <span className="ef-cat-btn__icon">{cat.icon}</span>
            <span className="ef-cat-btn__name">{cat.name}</span>
          </button>
        ))}
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Amount Input
// ─────────────────────────────────────────────────────────────
function AmountInput({ value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 18, fontWeight: 700,
          color: 'var(--bs-secondary-color)',
        }}>₹</span>
        <input
          type="number" step="0.01" min="0"
          placeholder="0.00"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...S.amtInput,
            borderColor: error ? '#ef4444' : focused ? 'var(--bs-primary)' : 'var(--bs-border-color)',
          }}
        />
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Frequency Selector
// ─────────────────────────────────────────────────────────────
function FreqPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {FREQ.map(f => (
        <button
          key={f.val}
          type="button"
          style={S.freqBtn(value === f.val)}
          onClick={() => onChange(f.val)}
        >
          <i className={`bi ${f.icon} d-block mb-1`} style={{ fontSize: 18 }} />
          <div>{f.label}</div>
          <div style={{ fontSize: 10, opacity: 0.75 }}>{f.desc}</div>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Date Scheduler — inlined, no prop chain, uses setForm directly
// ─────────────────────────────────────────────────────────────
// NOTE: This is rendered inside RecurringFormModal using form state directly.
// Do NOT pass as a separate component — use renderScheduler() below instead.

// ─────────────────────────────────────────────────────────────
// Main Form Modal
// ─────────────────────────────────────────────────────────────
function RecurringFormModal({ categories, item, onClose, onSubmit, loading }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    category:   item?.category?._id || item?.category || '',
    amount:     item?.amount        || '',
    description:item?.description   || '',
    notes:      item?.notes         || '',
    frequency:  item?.frequency     || 'monthly',
    dayOfMonth: item?.dayOfMonth    || 1,
    dayOfWeek:  item?.dayOfWeek     || 1,
  });
  const [descriptions, setDescriptions] = useState([]);
  const [customDesc,   setCustomDesc]   = useState('');
  const [errors,       setErrors]       = useState({});
  const [step,         setStep]         = useState(1); // 1=details, 2=schedule

  useEffect(() => {
    if (!form.category) { setDescriptions([]); return; }
    api.get(`/categories/${form.category}/descriptions`)
      .then(r => setDescriptions(r.data.data || []))
      .catch(() => setDescriptions([]));
  }, [form.category]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validateStep1 = () => {
    const e = {};
    const desc = form.description === '__custom__' ? customDesc : form.description;
    if (!form.category)                    e.category    = 'Category select karo';
    if (!form.amount || +form.amount <= 0) e.amount      = 'Valid amount dalo';
    if (!desc.trim())                      e.description = 'Description dalo';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateStep1()) { setStep(1); return; }
    // Strip any accidental surrounding quotes from description
    const rawDesc   = form.description === '__custom__' ? customDesc : form.description;
    const cleanDesc = String(rawDesc).replace(/^["']+|["']+$/g, '').trim();
    onSubmit({
      category:    String(form.category),
      amount:      parseFloat(form.amount),
      description: cleanDesc,
      notes:       String(form.notes || '').replace(/^["']+|["']+$/g, '').trim(),
      frequency:   form.frequency,
      dayOfMonth:  parseInt(form.dayOfMonth, 10),
      dayOfWeek:   parseInt(form.dayOfWeek,  10),
    });
  };

  const selCat = categories.find(c => c._id === form.category);
  const finalDesc = form.description === '__custom__' ? customDesc : form.description;

  return (
    <div style={S.formOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.formBox}>

        {/* Header */}
        <div style={S.formHeader}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {isEdit ? 'Edit Recurring Expense' : 'New Recurring Expense'}
              </h5>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                {step === 1 ? 'Step 1 of 2 — Expense details' : 'Step 2 of 2 — Schedule set karo'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                fontSize: 20, cursor: 'pointer',
                color: 'var(--bs-secondary-color)', lineHeight: 1,
                padding: 2,
              }}
            >×</button>
          </div>

          {/* Progress bar */}
          <div style={{
            marginTop: 12, height: 3, borderRadius: 3,
            background: 'var(--bs-border-color)',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'var(--bs-primary)',
              width: step === 1 ? '50%' : '100%',
              transition: 'width .3s ease',
            }} />
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={S.formBody}>

            {/* ── STEP 1: Details ── */}
            {step === 1 && (
              <>
                <div style={S.sectionDivider}>Category</div>
                <CategoryPicker
                  categories={categories}
                  value={form.category}
                  onChange={v => set('category', v)}
                  error={errors.category}
                />

                <div style={S.sectionDivider}>Description</div>
                {descriptions.length > 0 ? (
                  <>
                    <select
                      className="form-select"
                      style={{ borderRadius: 10, marginBottom: 8 }}
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                    >
                      <option value="">Select description…</option>
                      {descriptions.map(d => <option key={d} value={d}>{d}</option>)}
                      <option value="__custom__">Custom (type below)</option>
                    </select>
                    {form.description === '__custom__' && (
                      <input
                        type="text"
                        className="form-control"
                        style={{ borderRadius: 10 }}
                        placeholder="e.g. House Rent, Car EMI, Netflix"
                        value={customDesc}
                        onChange={e => setCustomDesc(e.target.value)}
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    style={{ borderRadius: 10 }}
                    placeholder="e.g. House Rent, Car EMI, Netflix"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                )}
                {errors.description && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{errors.description}</div>
                )}

                <div style={S.sectionDivider}>Amount</div>
                <AmountInput
                  value={form.amount}
                  onChange={v => set('amount', v)}
                  error={errors.amount}
                />

                <div style={S.sectionDivider}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                <textarea
                  className="form-control"
                  style={{ borderRadius: 10, fontSize: 14 }}
                  rows={2}
                  placeholder="Extra details… e.g. SBI Bank EMI, HDFC credit card"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </>
            )}

            {/* ── STEP 2: Schedule ── */}
            {step === 2 && (
              <>
                {/* Preview pill */}
                {selCat && finalDesc && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    background: selCat.color + '12',
                    border: `1px solid ${selCat.color}30`,
                    marginBottom: 20,
                  }}>
                    <div style={S.iconBubble(selCat.color)}>{selCat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{finalDesc}</div>
                      <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{selCat.name}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: selCat.color }}>
                      ₹{parseFloat(form.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                <div style={S.sectionDivider}>Frequency</div>
                <FreqPicker value={form.frequency} onChange={v => set('frequency', v)} />

                <div style={{ ...S.sectionDivider, marginTop: 24 }}>
                  {form.frequency === 'monthly' ? 'Date select karo' :
                   form.frequency === 'weekly'  ? 'Din select karo'  :
                   form.frequency === 'daily'   ? 'Daily schedule'   : 'Yearly reminder'}
                </div>

                {/* ── Inlined date scheduler — direct set() calls fix stale closure ── */}
                {form.frequency === 'daily' && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: 13, color: 'var(--bs-body-color)',
                  }}>
                    <i className="bi bi-info-circle me-2 text-primary" />
                    Har roz reminder aayega aur expense add hoga.
                  </div>
                )}

                {form.frequency === 'yearly' && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: 13, color: 'var(--bs-body-color)',
                  }}>
                    <i className="bi bi-info-circle me-2 text-primary" />
                    Ek saal baad reminder aayega.
                  </div>
                )}

                {form.frequency === 'weekly' && (
                  <div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DAYS_SHORT.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          style={{
                            width: 44, height: 44, borderRadius: '50%',
                            border: form.dayOfWeek === i
                              ? '2px solid var(--bs-primary)'
                              : '1.5px solid var(--bs-border-color)',
                            background: form.dayOfWeek === i ? 'var(--bs-primary)' : 'transparent',
                            color: form.dayOfWeek === i ? '#fff' : 'var(--bs-secondary-color)',
                            cursor: 'pointer', transition: 'all .15s',
                            fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onClick={() => {
                            setForm(p => ({ ...p, dayOfWeek: i }));
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 10 }}>
                      <i className="bi bi-clock me-1" />
                      Har <strong>{DAYS_FULL[form.dayOfWeek]}</strong> ko reminder aayega
                    </div>
                  </div>
                )}

                {form.frequency === 'monthly' && (
                  <div>
                    {/* Calendar grid header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 4, marginBottom: 4,
                    }}>
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} style={{
                          textAlign: 'center', fontSize: 11,
                          fontWeight: 700, color: 'var(--bs-secondary-color)',
                          paddingBottom: 4,
                        }}>{d}</div>
                      ))}
                    </div>
                    {/* Date grid — 1 to 31 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 4,
                    }}>
                      {/* 2 empty offset cells */}
                      <div /><div />
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setForm(p => ({ ...p, dayOfMonth: d }));
                          }}
                          style={{
                            height: 34, borderRadius: 8,
                            border: form.dayOfMonth === d
                              ? '2px solid var(--bs-primary)'
                              : '1px solid var(--bs-border-color)',
                            background: form.dayOfMonth === d
                              ? 'var(--bs-primary)' : 'transparent',
                            color: form.dayOfMonth === d
                              ? '#fff' : 'var(--bs-secondary-color)',
                            cursor: 'pointer', transition: 'all .12s',
                            fontSize: 12, fontWeight: form.dayOfMonth === d ? 700 : 400,
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 10 }}>
                      <i className="bi bi-calendar-check me-1 text-primary" />
                      Har mahine <strong>{form.dayOfMonth}</strong> tarikh ko reminder aayega
                    </div>
                  </div>
                )}

                {/* Live reminder summary */}
                <div style={{
                  marginTop: 20, padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bs-primary)', marginBottom: 8, letterSpacing: '0.06em' }}>
                    REMINDER SUMMARY
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--bs-body-color)', fontWeight: 500 }}>
                    {form.frequency === 'monthly' &&
                      `Har mahine ${form.dayOfMonth} tarikh ko reminder aayega`}
                    {form.frequency === 'weekly' &&
                      `Har ${DAYS_FULL[form.dayOfWeek]} ko reminder aayega`}
                    {form.frequency === 'daily' && 'Har roz reminder aayega'}
                    {form.frequency === 'yearly' && 'Ek saal baad reminder aayega'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 4 }}>
                    Dashboard par notification milegi — confirm ya skip kar sakte ho
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={S.formFooter}>
            {step === 2 && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setStep(1)}
              >
                <i className="bi bi-arrow-left me-1" />Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            {step === 1 ? (
              <button
                type="button"
                className="btn ef-btn-primary"
                onClick={handleNext}
              >
                Next <i className="bi bi-arrow-right ms-1" />
              </button>
            ) : (
              <button
                type="submit"
                className="btn ef-btn-primary"
                disabled={loading}
                style={{ minWidth: 140 }}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  : <><i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-arrow-repeat'} me-2`} />{isEdit ? 'Update' : 'Set Recurring'}</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────────────────────
function ConfirmModal({ item, onConfirm, onSkip, onClose, loading }) {
  return (
    <div style={S.confirmBox} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.confirmCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={S.iconBubble(item.category?.color || '#6366f1')}>
            {item.category?.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{item.description}</div>
            <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>{item.category?.name}</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>
            ₹{item.amount?.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: 13, color: 'var(--bs-body-color)',
        }}>
          <i className="bi bi-bell-fill text-warning me-2" />
          Yeh recurring expense due hai. Aaj ki date mein add karna chahte ho?
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Baad mein
          </button>
          <button
            className="btn btn-outline-warning btn-sm"
            onClick={onSkip}
            style={{ flex: 1 }}
          >
            <i className="bi bi-skip-forward me-1" />Is baar skip
          </button>
          <button
            className="btn ef-btn-primary btn-sm"
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1.5 }}
          >
            {loading
              ? <span className="spinner-border spinner-border-sm" />
              : <><i className="bi bi-check-lg me-1" />Add Expense</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Quick Schedule Edit Modal — opens directly on schedule fields
// ─────────────────────────────────────────────────────────────
function QuickScheduleModal({ item, onClose, onSave, loading }) {
  const [frequency,  setFrequency]  = useState(item.frequency  || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState(item.dayOfMonth || 1);
  const [dayOfWeek,  setDayOfWeek]  = useState(item.dayOfWeek  || 1);

  const handleSave = () => {
    onSave({ frequency, dayOfMonth, dayOfWeek });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1060,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--bs-body-bg)',
        borderRadius: 20,
        border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '0.5px solid var(--bs-border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Schedule Edit Karo</div>
            <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
              {item.description} · ₹{item.amount?.toLocaleString('en-IN')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 20,
              cursor: 'pointer', color: 'var(--bs-secondary-color)',
              lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>

          {/* Frequency */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
              marginBottom: 10,
            }}>Frequency</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {FREQ.map(f => (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => setFrequency(f.val)}
                  style={{
                    flex: 1, padding: '10px 4px',
                    borderRadius: 10,
                    border: frequency === f.val
                      ? '2px solid var(--bs-primary)'
                      : '1.5px solid var(--bs-border-color)',
                    background: frequency === f.val ? 'var(--bs-primary)' : 'transparent',
                    color: frequency === f.val ? '#fff' : 'var(--bs-secondary-color)',
                    cursor: 'pointer', transition: 'all .15s',
                    textAlign: 'center', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <i className={`bi ${f.icon} d-block mb-1`} style={{ fontSize: 16 }} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Day picker */}
          {frequency === 'monthly' && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
                marginBottom: 10,
              }}>Kaunsi tarikh?</div>
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 700,
                    color: 'var(--bs-secondary-color)', paddingBottom: 4,
                  }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                <div /><div />
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayOfMonth(d)}
                    style={{
                      height: 34, borderRadius: 8,
                      border: dayOfMonth === d
                        ? '2px solid var(--bs-primary)'
                        : '1px solid var(--bs-border-color)',
                      background: dayOfMonth === d ? 'var(--bs-primary)' : 'transparent',
                      color: dayOfMonth === d ? '#fff' : 'var(--bs-secondary-color)',
                      cursor: 'pointer', transition: 'all .12s',
                      fontSize: 12, fontWeight: dayOfMonth === d ? 700 : 400,
                    }}
                  >{d}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 10 }}>
                <i className="bi bi-calendar-check me-1 text-primary" />
                Har mahine <strong>{dayOfMonth}</strong> tarikh ko reminder aayega
              </div>
            </div>
          )}

          {frequency === 'weekly' && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
                marginBottom: 10,
              }}>Kaunsa din?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOfWeek(i)}
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      border: dayOfWeek === i
                        ? '2px solid var(--bs-primary)'
                        : '1.5px solid var(--bs-border-color)',
                      background: dayOfWeek === i ? 'var(--bs-primary)' : 'transparent',
                      color: dayOfWeek === i ? '#fff' : 'var(--bs-secondary-color)',
                      cursor: 'pointer', transition: 'all .15s',
                      fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >{d}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 10 }}>
                <i className="bi bi-clock me-1" />
                Har <strong>{DAYS_FULL[dayOfWeek]}</strong> ko reminder aayega
              </div>
            </div>
          )}

          {frequency === 'daily' && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 13,
            }}>
              <i className="bi bi-info-circle me-2 text-primary" />
              Har roz reminder aayega.
            </div>
          )}

          {frequency === 'yearly' && (
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 13,
            }}>
              <i className="bi bi-info-circle me-2 text-primary" />
              Ek saal baad reminder aayega.
            </div>
          )}

          {/* Summary pill */}
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            fontSize: 13, fontWeight: 500,
          }}>
            <i className="bi bi-bell me-2 text-primary" />
            {frequency === 'monthly' && `Har mahine ${dayOfMonth} tarikh`}
            {frequency === 'weekly'  && `Har ${DAYS_FULL[dayOfWeek]}`}
            {frequency === 'daily'   && 'Har roz'}
            {frequency === 'yearly'  && 'Ek saal mein ek baar'}
            {' '}ko reminder aayega
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '0.5px solid var(--bs-border-color)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn ef-btn-primary"
            onClick={handleSave}
            disabled={loading}
            style={{ minWidth: 130 }}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : <><i className="bi bi-check-lg me-2" />Schedule Save Karo</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recurring Card
// ─────────────────────────────────────────────────────────────
function RecurringCard({ item, isDue, onEdit, onEditSchedule, onDelete, onConfirm, onToggle, format }) {
  const badge = dueBadge(item.nextDueAt);
  const freq  = FREQ.find(f => f.val === item.frequency);

  return (
    <div style={S.card(isDue, !item.isActive)}>
      {/* Top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={S.iconBubble(item.category?.color || '#6366f1')}>
            {item.category?.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{item.description}</div>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
              {item.category?.name}
            </div>
          </div>
        </div>

        {/* Active toggle */}
        <div className="form-check form-switch mb-0" style={{ paddingLeft: '2.5rem' }}>
          <input
            className="form-check-input"
            type="checkbox"
            checked={item.isActive}
            onChange={() => onToggle(item)}
            title={item.isActive ? 'Pause karo' : 'Resume karo'}
          />
        </div>
      </div>

      {/* Amount */}
      <div style={{
        fontSize: 24, fontWeight: 800,
        color: 'var(--bs-body-color)',
        marginBottom: 10,
      }}>
        ₹{item.amount?.toLocaleString('en-IN')}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {/* Frequency */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(99,102,241,0.1)', color: '#6366f1',
          borderRadius: 20, padding: '3px 10px',
          fontSize: 11, fontWeight: 600,
        }}>
          <i className={`bi ${freq?.icon}`} style={{ fontSize: 12 }} />
          {freq?.label}
          {item.frequency === 'monthly' && ` · ${item.dayOfMonth} tarikh`}
          {item.frequency === 'weekly'  && ` · ${DAYS_SHORT[item.dayOfWeek]}`}
        </span>

        {/* Due badge */}
        {badge && (
          <span style={S.duePill(badge.color)}>
            <i className="bi bi-clock" style={{ fontSize: 11 }} />
            {badge.label}
          </span>
        )}

        {/* Paused */}
        {!item.isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(100,116,139,0.12)', color: '#64748b',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 11, fontWeight: 600,
          }}>
            <i className="bi bi-pause-circle" style={{ fontSize: 11 }} />Paused
          </span>
        )}
      </div>

      {/* Last added */}
      {item.lastAddedAt && (
        <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 12 }}>
          <i className="bi bi-check-circle-fill me-1" style={{ color: '#22c55e' }} />
          Last added {new Date(item.lastAddedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
          })}
        </div>
      )}

      {item.notes && (
        <div style={{
          fontSize: 12, color: 'var(--bs-secondary-color)',
          marginBottom: 12, fontStyle: 'italic',
        }}>
          <i className="bi bi-sticky me-1" />{item.notes}
        </div>
      )}

      {/* Actions */}
      <div style={{
        marginTop: 'auto', paddingTop: 12,
        borderTop: '0.5px solid var(--bs-border-color)',
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {isDue && (
          <button
            className="btn btn-sm ef-btn-primary"
            style={{ flex: 1, borderRadius: 8 }}
            onClick={() => onConfirm(item)}
          >
            <i className="bi bi-plus-lg me-1" />Add Now
          </button>
        )}
        {/* Edit Schedule — opens quick date modal */}
        <button
          className="btn btn-sm btn-outline-primary"
          style={{ borderRadius: 8, flex: isDue ? 'none' : 1 }}
          onClick={() => onEditSchedule(item)}
          title="Schedule change karo"
        >
          <i className="bi bi-calendar3 me-1" />
          Schedule
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          style={{ borderRadius: 8 }}
          onClick={() => onEdit(item)}
          title="Edit all details"
        >
          <i className="bi bi-pencil" />
        </button>
        <button
          className="btn btn-sm btn-outline-danger"
          style={{ borderRadius: 8 }}
          onClick={() => onDelete(item._id)}
          title="Delete"
        >
          <i className="bi bi-trash" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function RecurringPage() {
  const {
    items, dueItems, loading, submitting,
    addRecurring, updateRecurring, deleteRecurring,
    confirmDue, skipDue, toggleActive,
  } = useRecurring();

  const { categories } = useCategories();
  const { format }     = useCurrency();

  const [showForm,        setShowForm]        = useState(false);
  const [editing,         setEditing]         = useState(null);
  const [confirming,      setConfirming]      = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null); // for quick schedule edit
  const [filter,          setFilter]          = useState('all');

  const handleFormSubmit = async (payload) => {
    const ok = editing
      ? await updateRecurring(editing._id, payload)
      : await addRecurring(payload);
    if (ok) { setShowForm(false); setEditing(null); }
  };

  // Save only schedule fields
  const handleScheduleSave = async (schedulePayload) => {
    if (!editingSchedule) return;
    const ok = await updateRecurring(editingSchedule._id, schedulePayload);
    if (ok) setEditingSchedule(null);
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    await confirmDue(confirming._id, confirming.description);
    setConfirming(null);
  };

  const handleSkip = async () => {
    if (!confirming) return;
    await skipDue(confirming._id, confirming.description);
    setConfirming(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Is recurring expense ko delete karein?')) deleteRecurring(id);
  };

  const totalMonthly = items
    .filter(i => i.isActive && i.frequency === 'monthly')
    .reduce((s, i) => s + i.amount, 0);

  const filteredItems = items.filter(i => {
    if (filter === 'active') return i.isActive;
    if (filter === 'paused') return !i.isActive;
    return true;
  });

  return (
    <div className="ef-page" style={S.page}>

      {/* ── Header ── */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Recurring Expenses</h4>
          <p className="text-muted small mb-0">
            {items.filter(i => i.isActive).length} active
            {dueItems.length > 0 && (
              <span className="ms-2 badge bg-warning text-dark">
                <i className="bi bi-bell-fill me-1" style={{ fontSize: 10 }} />
                {dueItems.length} due
              </span>
            )}
          </p>
        </div>
        <button
          className="btn ef-btn-primary"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">Add Recurring</span>
          <span className="d-sm-none">Add</span>
        </button>
      </div>

      {/* ── Summary cards ── */}
      {items.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            {
              icon: 'bi-arrow-repeat', color: '#6366f1',
              label: 'Monthly Recurring', val: format(totalMonthly),
              bg: 'rgba(99,102,241,0.1)',
            },
            {
              icon: 'bi-check-circle-fill', color: '#22c55e',
              label: 'Active', val: items.filter(i => i.isActive).length,
              bg: 'rgba(34,197,94,0.1)',
            },
            {
              icon: 'bi-bell-fill', color: '#f59e0b',
              label: 'Due Now', val: dueItems.length || '—',
              bg: 'rgba(245,158,11,0.1)',
            },
            {
              icon: 'bi-pause-circle', color: '#94a3b8',
              label: 'Paused', val: items.filter(i => !i.isActive).length,
              bg: 'rgba(148,163,184,0.1)',
            },
          ].map(({ icon, color, label, val, bg }) => (
            <div className="col-6 col-md-3" key={label}>
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 14, padding: '16px',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: bg, color, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10, fontSize: 17,
                }}>
                  <i className={`bi ${icon}`} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Due Now Banner ── */}
      {dueItems.length > 0 && (
        <div style={{
          borderRadius: 14,
          border: '1.5px solid rgba(245,158,11,0.4)',
          background: 'rgba(245,158,11,0.05)',
          marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px',
            background: 'rgba(245,158,11,0.1)',
            borderBottom: '0.5px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="bi bi-bell-fill text-warning" />
            <strong style={{ fontSize: 14 }}>Due Now — Confirm karo ya skip karo</strong>
            <span style={{
              marginLeft: 4,
              background: '#f59e0b', color: '#fff',
              borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {dueItems.length}
            </span>
          </div>
          {dueItems.map((item, idx) => (
            <div
              key={item._id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: idx < dueItems.length - 1
                  ? '0.5px solid rgba(245,158,11,0.15)' : 'none',
              }}
            >
              <div style={S.iconBubble(item.category?.color || '#f59e0b')}>
                {item.category?.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }} className="text-truncate">
                  {item.description}
                </div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>
                  {item.category?.name}
                  <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>
                    {dueBadge(item.nextDueAt)?.label}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                ₹{item.amount?.toLocaleString('en-IN')}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn-sm ef-btn-primary"
                  style={{ borderRadius: 8 }}
                  onClick={() => setConfirming(item)}
                >
                  <i className="bi bi-plus-lg me-1" />Add
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ borderRadius: 8 }}
                  onClick={() => skipDue(item._id, item.description)}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter tabs ── */}
      {items.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          borderBottom: '0.5px solid var(--bs-border-color)',
          paddingBottom: 12,
        }}>
          {[
            { val: 'all',    label: `All (${items.length})` },
            { val: 'active', label: `Active (${items.filter(i => i.isActive).length})` },
            { val: 'paused', label: `Paused (${items.filter(i => !i.isActive).length})` },
          ].map(t => (
            <button
              key={t.val}
              type="button"
              onClick={() => setFilter(t.val)}
              style={{
                padding: '6px 16px', borderRadius: 20,
                border: filter === t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
                background: filter === t.val ? 'var(--bs-primary)' : 'transparent',
                color: filter === t.val ? '#fff' : 'var(--bs-secondary-color)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: 40, height: 40 }} />
          <p className="text-muted mt-3">Load ho raha hai…</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔁</div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Koi recurring expense nahi</h5>
          <p className="text-muted" style={{ maxWidth: 300, margin: '0 auto 20px' }}>
            Rent, EMI, subscriptions — ek baar set karo, reminder automatic aayega
          </p>
          <button
            className="btn ef-btn-primary"
            style={{ borderRadius: 10, padding: '10px 24px' }}
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-lg me-2" />Pehla Recurring Add Karo
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-filter-circle fs-2 d-block mb-2" />
          Is filter mein koi item nahi
        </div>
      ) : (
        <div className="row g-3">
          {filteredItems.map(item => (
            <div className="col-12 col-md-6 col-lg-4" key={item._id}>
              <RecurringCard
                item={item}
                isDue={dueItems.some(d => d._id === item._id)}
                onEdit={i => { setEditing(i); setShowForm(true); }}
                onEditSchedule={i => setEditingSchedule(i)}
                onDelete={handleDelete}
                onConfirm={setConfirming}
                onToggle={toggleActive}
                format={format}
              />
            </div>
          ))}
        </div>
      )}

      {/* Full form modal */}
      {showForm && (
        <RecurringFormModal
          categories={categories}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleFormSubmit}
          loading={submitting}
        />
      )}

      {/* Quick Schedule Edit modal */}
      {editingSchedule && (
        <QuickScheduleModal
          item={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={handleScheduleSave}
          loading={submitting}
        />
      )}

      {/* Confirm modal */}
      {confirming && (
        <ConfirmModal
          item={confirming}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          onClose={() => setConfirming(null)}
          loading={submitting}
        />
      )}
    </div>
  );
}