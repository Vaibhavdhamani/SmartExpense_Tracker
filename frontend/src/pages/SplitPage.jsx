import { useState, useEffect } from 'react';
import { useSplit }      from '../hooks/useSplit';
import { useCategories } from '../hooks/useCategories';
import { useCurrency }   from '../hooks/useCurrency';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ef4444',
  '#06b6d4','#ec4899','#8b5cf6','#14b8a6','#64748b',
];

function initials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const lbl = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  color: 'var(--bs-secondary-color)', marginBottom: 8,
  display: 'block',
};

// ─────────────────────────────────────────────────────────────
// Split Form Modal
// ─────────────────────────────────────────────────────────────
function SplitFormModal({ categories, onClose, onSubmit, loading }) {
  const [step, setStep]           = useState(1);
  const [splitType, setSplitType] = useState('equal');
  const [form, setForm]           = useState({
    category:    '',
    title:       '',
    description: '',
    totalAmount: '',
    date:        new Date().toISOString().slice(0, 10),
    notes:       '',
  });
  const [participants, setParticipants] = useState([
    { name: 'Me', isCreator: true,  isPaid: true,  amount: '', percentage: '' },
    { name: '',   isCreator: false, isPaid: false, amount: '', percentage: '' },
  ]);
  const [errors, setErrors] = useState({});

  // Auto-calculate equal splits
  useEffect(() => {
    if (splitType !== 'equal' || !form.totalAmount) return;
    const n     = participants.length;
    const share = Math.round((parseFloat(form.totalAmount) / n) * 100) / 100;
    setParticipants(prev => prev.map((p, i) => ({
      ...p,
      amount: i === 0 ? String(Math.round((parseFloat(form.totalAmount) - share * (n - 1)) * 100) / 100) : String(share),
    })));
  }, [form.totalAmount, participants.length, splitType]);

  // Auto-calculate percentage splits
  useEffect(() => {
    if (splitType !== 'percentage' || !form.totalAmount) return;
    setParticipants(prev => prev.map(p => ({
      ...p,
      amount: p.percentage
        ? String(Math.round((parseFloat(form.totalAmount) * parseFloat(p.percentage) / 100) * 100) / 100)
        : '',
    })));
  }, [form.totalAmount, splitType]);

  const addParticipant = () => {
    setParticipants(prev => [
      ...prev,
      { name: '', isCreator: false, isPaid: false, amount: '', percentage: '' },
    ]);
  };

  const removeParticipant = (idx) => {
    if (participants.length <= 2) return;
    setParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const updateParticipant = (idx, key, val) => {
    setParticipants(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  };

  const totalCustom = participants.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totalPct    = participants.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);

  const validate1 = () => {
    const e = {};
    if (!form.category)                         e.category = 'Please select a category';
    if (!form.title.trim())                     e.title       = 'Title dalo';
    if (!form.totalAmount || +form.totalAmount <= 0) e.totalAmount = 'Valid amount dalo';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validate2 = () => {
    const e = {};
    const emptyNames = participants.filter(p => !p.name.trim());
    if (emptyNames.length) { e.participants = 'Sabka naam bharo'; }
    if (splitType === 'custom') {
      const diff = Math.abs(totalCustom - parseFloat(form.totalAmount));
      if (diff > 1) e.amounts = `Total ₹${totalCustom.toFixed(0)} must equal ₹${parseFloat(form.totalAmount).toFixed(0)}`;
    }
    if (splitType === 'percentage') {
      if (Math.abs(totalPct - 100) > 0.5) e.pct = `Percentages must total 100% (currently ${totalPct.toFixed(0)}%)`;
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleNext = () => { if (validate1()) setStep(2); };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate2()) return;
    onSubmit({
      category:    form.category,
      title:       form.title.trim(),
      description: form.description.trim(),
      totalAmount: parseFloat(form.totalAmount),
      date:        form.date,
      notes:       form.notes.trim(),
      splitType,
      participants: participants.map(p => ({
        name:       p.name.trim(),
        isCreator:  p.isCreator,
        isPaid:     p.isCreator ? true : false,
        amount:     parseFloat(p.amount) || 0,
        percentage: parseFloat(p.percentage) || 0,
      })),
    });
  };

  const selCat = categories.find(c => c._id === form.category);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1050, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 540, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bs-body-bg)',
        borderRadius: 20, border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px', flexShrink: 0,
          borderBottom: '0.5px solid var(--bs-border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Split Expense
              </h5>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                {step === 1 ? 'Step 1 of 2 — Bill details' : 'Step 2 of 2 — Who pays what?'}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 22,
              cursor: 'pointer', color: 'var(--bs-secondary-color)', lineHeight: 1,
            }}>×</button>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 10, height: 3, borderRadius: 3, background: 'var(--bs-border-color)' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: 'var(--bs-primary)',
              width: step === 1 ? '50%' : '100%', transition: 'width .3s',
            }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px' }}>

            {/* ── STEP 1: Bill details ── */}
            {step === 1 && (
              <>
                {/* Category */}
                <div style={{ marginBottom: 16 }}>
                  <span style={lbl}>Category</span>
                  <div className="ef-cat-grid">
                    {categories.map(cat => (
                      <button type="button" key={cat._id}
                        className={`ef-cat-btn ${form.category === cat._id ? 'ef-cat-btn--active' : ''}`}
                        style={{ '--cat-color': cat.color }}
                        onClick={() => setForm(p => ({ ...p, category: cat._id }))}>
                        <span className="ef-cat-btn__icon">{cat.icon}</span>
                        <span className="ef-cat-btn__name">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <div className="text-danger small mt-1">{errors.category}</div>}
                </div>

                {/* Title */}
                <div style={{ marginBottom: 14 }}>
                  <span style={lbl}>Bill Title *</span>
                  <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    style={{ borderRadius: 10 }}
                    placeholder="e.g. Dinner at Pizza Hut, Goa Trip Hotel, Movie Night"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                  {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                </div>

                {/* Total Amount */}
                <div style={{ marginBottom: 14 }}>
                  <span style={lbl}>Total Bill Amount (₹) *</span>
                  <div className="input-group">
                    <span className="input-group-text" style={{ fontWeight: 700, fontSize: 16 }}>₹</span>
                    <input type="number" min="1" step="1"
                      className={`form-control ${errors.totalAmount ? 'is-invalid' : ''}`}
                      style={{ fontSize: 18, fontWeight: 700 }}
                      placeholder="0"
                      value={form.totalAmount}
                      onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} />
                  </div>
                  {errors.totalAmount && <div className="text-danger small mt-1">{errors.totalAmount}</div>}
                </div>

                {/* Date */}
                <div style={{ marginBottom: 14 }}>
                  <span style={lbl}>Date</span>
                  <input type="date" className="form-control" style={{ borderRadius: 10 }}
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 8 }}>
                  <span style={lbl}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>(optional)</span></span>
                  <textarea className="form-control" style={{ borderRadius: 10, fontSize: 13 }}
                    rows={2} placeholder="Any extra details…"
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </>
            )}

            {/* ── STEP 2: Participants ── */}
            {step === 2 && (
              <>
                {/* Preview */}
                {selCat && form.totalAmount && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12, marginBottom: 18,
                    background: selCat.color + '12',
                    border: `1px solid ${selCat.color}30`,
                  }}>
                    <span style={{ fontSize: 24 }}>{selCat.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{form.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{selCat.name} · {form.date}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: selCat.color }}>
                      ₹{parseFloat(form.totalAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {/* Split type */}
                <div style={{ marginBottom: 18 }}>
                  <span style={lbl}>Split Type</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { val: 'equal',      label: 'Equal',      icon: 'bi-distribute-horizontal', desc: 'Sabka equal share' },
                      { val: 'custom',     label: 'Custom ₹',   icon: 'bi-pencil-square',         desc: 'Manual amounts' },
                      { val: 'percentage', label: 'Percent %',  icon: 'bi-percent',               desc: 'By percentage' },
                    ].map(t => (
                      <button key={t.val} type="button"
                        onClick={() => setSplitType(t.val)}
                        style={{
                          flex: 1, padding: '10px 4px', borderRadius: 10, textAlign: 'center',
                          border: splitType === t.val ? '2px solid var(--bs-primary)' : '1.5px solid var(--bs-border-color)',
                          background: splitType === t.val ? 'var(--bs-primary)' : 'transparent',
                          color: splitType === t.val ? '#fff' : 'var(--bs-secondary-color)',
                          cursor: 'pointer', transition: 'all .15s',
                        }}>
                        <i className={`bi ${t.icon} d-block mb-1`} style={{ fontSize: 18 }} />
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{t.label}</div>
                        <div style={{ fontSize: 10, opacity: .8 }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Participants */}
                <div style={{ marginBottom: 8 }}>
                  <span style={lbl}>Participants ({participants.length})</span>
                  {errors.participants && <div className="text-danger small mb-2">{errors.participants}</div>}

                  {participants.map((p, idx) => (
                    <div key={idx} style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      marginBottom: 10, padding: '10px 12px',
                      background: p.isCreator ? 'rgba(99,102,241,0.06)' : 'var(--bs-body-bg)',
                      border: `1px solid ${p.isCreator ? 'rgba(99,102,241,0.2)' : 'var(--bs-border-color)'}`,
                      borderRadius: 12,
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: p.name ? avatarColor(p.name) : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                      }}>
                        {p.name ? initials(p.name) : '?'}
                      </div>

                      {/* Name */}
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ borderRadius: 8, flex: 2 }}
                        placeholder={`Person ${idx + 1} ka naam`}
                        value={p.name}
                        disabled={p.isCreator}
                        onChange={e => updateParticipant(idx, 'name', e.target.value)}
                      />

                      {/* Amount / Percentage */}
                      {splitType === 'equal' && (
                        <div style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                          minWidth: 70, textAlign: 'center', flexShrink: 0,
                        }}>
                          ₹{p.amount || '—'}
                        </div>
                      )}

                      {splitType === 'custom' && (
                        <div className="input-group input-group-sm" style={{ flex: 1.2, maxWidth: 100 }}>
                          <span className="input-group-text">₹</span>
                          <input type="number" min="0" step="1"
                            className="form-control"
                            style={{ borderRadius: '0 8px 8px 0' }}
                            placeholder="0"
                            value={p.amount}
                            onChange={e => updateParticipant(idx, 'amount', e.target.value)}
                          />
                        </div>
                      )}

                      {splitType === 'percentage' && (
                        <div className="input-group input-group-sm" style={{ flex: 1.2, maxWidth: 110 }}>
                          <input type="number" min="0" max="100" step="1"
                            className="form-control"
                            style={{ borderRadius: '8px 0 0 8px' }}
                            placeholder="0"
                            value={p.percentage}
                            onChange={e => updateParticipant(idx, 'percentage', e.target.value)}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                      )}

                      {/* Creator badge / Remove button */}
                      {p.isCreator ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: 'rgba(99,102,241,0.15)', color: '#6366f1', flexShrink: 0,
                        }}>You</span>
                      ) : (
                        <button type="button"
                          onClick={() => removeParticipant(idx)}
                          style={{
                            background: 'none', border: 'none',
                            color: '#ef4444', cursor: 'pointer',
                            fontSize: 18, lineHeight: 1, flexShrink: 0,
                          }}>×</button>
                      )}
                    </div>
                  ))}

                  {/* Add person button */}
                  <button type="button"
                    onClick={addParticipant}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 12,
                      border: '1.5px dashed var(--bs-border-color)',
                      background: 'transparent', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, color: 'var(--bs-secondary-color)',
                      transition: 'all .15s',
                    }}>
                    <i className="bi bi-person-plus me-2" />
                    Add Person
                  </button>
                </div>

                {/* Validation totals */}
                {splitType === 'custom' && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, marginTop: 4,
                    background: Math.abs(totalCustom - parseFloat(form.totalAmount || 0)) <= 1
                      ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${Math.abs(totalCustom - parseFloat(form.totalAmount || 0)) <= 1
                      ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <i className={`bi ${Math.abs(totalCustom - parseFloat(form.totalAmount || 0)) <= 1
                      ? 'bi-check-circle text-success' : 'bi-exclamation-circle text-danger'} me-2`} />
                    Total: ₹{totalCustom.toFixed(2)} / ₹{parseFloat(form.totalAmount || 0).toFixed(2)}
                  </div>
                )}
                {splitType === 'percentage' && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, marginTop: 4,
                    background: Math.abs(totalPct - 100) <= 0.5 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${Math.abs(totalPct - 100) <= 0.5 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <i className={`bi ${Math.abs(totalPct - 100) <= 0.5
                      ? 'bi-check-circle text-success' : 'bi-exclamation-circle text-danger'} me-2`} />
                    Total: {totalPct.toFixed(0)}% / 100%
                  </div>
                )}
                {errors.amounts && <div className="text-danger small mt-1">{errors.amounts}</div>}
                {errors.pct    && <div className="text-danger small mt-1">{errors.pct}</div>}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 22px', flexShrink: 0,
            borderTop: '0.5px solid var(--bs-border-color)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            background: 'var(--bs-body-bg)',
          }}>
            {step === 2 && (
              <button type="button" className="btn btn-outline-secondary"
                onClick={() => setStep(1)}>
                <i className="bi bi-arrow-left me-1" />Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            {step === 1 ? (
              <button type="button" className="btn ef-btn-primary" onClick={handleNext}>
                Next <i className="bi bi-arrow-right ms-1" />
              </button>
            ) : (
              <button type="submit" className="btn ef-btn-primary" disabled={loading} style={{ minWidth: 150 }}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</>
                  : <><i className="bi bi-scissors me-2" />Create Split</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Split Detail Card
// ─────────────────────────────────────────────────────────────
function SplitCard({ split, onMarkPaid, onUnmarkPaid, onSettle, onDelete, format }) {
  const [expanded, setExpanded] = useState(false);
  const unpaidCount = split.participants.filter(p => !p.isCreator && !p.isPaid).length;
  const totalOwed   = split.participants
    .filter(p => !p.isCreator && !p.isPaid)
    .reduce((s, p) => s + p.amount, 0);
  const myShare = split.participants.find(p => p.isCreator)?.amount || 0;

  return (
    <div style={{
      background: 'var(--bs-body-bg)',
      border: split.isSettled
        ? '1.5px solid rgba(34,197,94,0.35)'
        : unpaidCount > 0 ? '1.5px solid rgba(245,158,11,0.35)' : '0.5px solid var(--bs-border-color)',
      borderRadius: 16, overflow: 'hidden',
      opacity: split.isSettled ? 0.85 : 1,
    }}>
      {/* Card header */}
      <div
        style={{ padding: '16px 18px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, fontSize: 22, flexShrink: 0,
            background: split.category?.color + '20',
            color: split.category?.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {split.category?.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }} className="text-truncate">
                {split.title}
              </div>
              {split.isSettled && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(34,197,94,0.15)', color: '#16a34a', flexShrink: 0,
                }}>✓ Settled</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
              {split.category?.name} · {new Date(split.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {format(split.totalAmount)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)' }}>
              {split.participants.length} people
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(99,102,241,0.1)', color: '#6366f1',
          }}>
            Your share: {format(myShare)}
          </span>
          {!split.isSettled && unpaidCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(245,158,11,0.1)', color: '#d97706',
            }}>
              <i className="bi bi-clock me-1" style={{ fontSize: 10 }} />
              {format(totalOwed)} pending ({unpaidCount} person{unpaidCount > 1 ? 's' : ''})
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(100,116,139,0.1)', color: '#64748b',
            textTransform: 'capitalize',
          }}>
            {split.splitType} split
          </span>
        </div>
      </div>

      {/* Expanded participants */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--bs-border-color)' }}>
          {split.participants.map(p => (
            <div key={p._id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px',
              borderBottom: '0.5px solid var(--bs-border-color)',
              background: p.isCreator ? 'rgba(99,102,241,0.03)' : 'transparent',
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: avatarColor(p.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>
                {initials(p.name)}
              </div>

              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {p.name} {p.isCreator && (
                    <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 700 }}>• You paid</span>
                  )}
                </div>
                {p.isPaid && p.paidAt && !p.isCreator && (
                  <div style={{ fontSize: 11, color: '#16a34a' }}>
                    Paid on {new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {format(p.amount)}
              </div>

              {/* Status + action */}
              {!p.isCreator && (
                <div style={{ flexShrink: 0 }}>
                  {p.isPaid ? (
                    <button
                      onClick={() => onUnmarkPaid(split._id, p._id, p.name)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                        border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer',
                      }}
                      title="Undo"
                    >
                      ✓ Paid
                    </button>
                  ) : (
                    <button
                      onClick={() => onMarkPaid(split._id, p._id, p.name)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: 'rgba(245,158,11,0.1)', color: '#d97706',
                        border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer',
                      }}
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Card actions */}
          <div style={{
            padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            {!split.isSettled && unpaidCount > 0 && (
              <button
                className="btn btn-sm ef-btn-primary"
                style={{ borderRadius: 8 }}
                onClick={() => onSettle(split._id, split.title)}
              >
                <i className="bi bi-check2-all me-1" />Settle All
              </button>
            )}
            <button
              className="btn btn-sm btn-outline-danger"
              style={{ borderRadius: 8, marginLeft: 'auto' }}
              onClick={() => onDelete(split._id)}
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function SplitPage() {
  const {
    splits, summary, loading, submitting,
    addSplit, deleteSplit,
    markPaid, unmarkPaid, settleAll,
  } = useSplit();

  const { categories } = useCategories();
  const { format }     = useCurrency();

  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('pending'); // pending | settled | all

  const handleSubmit = async (payload) => {
    const ok = await addSplit(payload);
    if (ok) setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Is split expense ko delete karein?')) deleteSplit(id);
  };

  const filteredSplits = splits.filter(s => {
    if (filter === 'pending') return !s.isSettled;
    if (filter === 'settled') return  s.isSettled;
    return true;
  });

  return (
    <div className="ef-page">

      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Split Expenses</h4>
          <p className="text-muted small mb-0">
            {splits.filter(s => !s.isSettled).length} pending
            {splits.filter(s => s.isSettled).length > 0 && (
              <span className="ms-2 text-success">
                · {splits.filter(s => s.isSettled).length} settled ✓
              </span>
            )}
          </p>
        </div>
        <button className="btn ef-btn-primary"
          onClick={() => setShowForm(true)}>
          <i className="bi bi-scissors me-1 me-md-2" />
          <span className="d-none d-sm-inline">New Split</span>
          <span className="d-sm-none">Split</span>
        </button>
      </div>

      {/* Summary cards */}
      {summary && splits.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            {
              icon: 'bi-scissors', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
              label: 'Total Bills Paid', val: `₹${summary.totalPaid?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-hourglass-split', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
              label: 'Pending Recovery', val: `₹${summary.totalOwed?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-check2-all', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
              label: 'Total Settled', val: `₹${summary.totalSettled?.toLocaleString('en-IN')}`,
            },
            {
              icon: 'bi-clock-history', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
              label: 'Pending Splits', val: summary.pendingCount || 0,
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

      {/* Filter tabs */}
      {splits.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          borderBottom: '0.5px solid var(--bs-border-color)', paddingBottom: 12,
        }}>
          {[
            { val: 'pending', label: `Pending (${splits.filter(s=>!s.isSettled).length})` },
            { val: 'settled', label: `Settled (${splits.filter(s=>s.isSettled).length})` },
            { val: 'all',     label: `All (${splits.length})` },
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

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: 40, height: 40 }} />
          <p className="text-muted mt-3">Loading…</p>
        </div>
      ) : splits.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✂️</div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>No split expenses yet</h5>
          <p className="text-muted" style={{ maxWidth: 320, margin: '0 auto 20px' }}>
            Dinner, trip, hotel — split bills with friends and track who owes what
          </p>
          <button className="btn ef-btn-primary"
            style={{ borderRadius: 10, padding: '10px 24px' }}
            onClick={() => setShowForm(true)}>
            <i className="bi bi-scissors me-2" />Create First Split
          </button>
        </div>
      ) : filteredSplits.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-filter-circle fs-2 d-block mb-2" />
          No splits in this filter
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredSplits.map(split => (
            <SplitCard
              key={split._id}
              split={split}
              onMarkPaid={markPaid}
              onUnmarkPaid={unmarkPaid}
              onSettle={settleAll}
              onDelete={handleDelete}
              format={format}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SplitFormModal
          categories={categories}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      )}
    </div>
  );
}