import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useCurrency }     from '../hooks/useCurrency';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { val: 'streaming',    label: 'Streaming',    icon: '🎬', color: '#ef4444' },
  { val: 'music',        label: 'Music',        icon: '🎵', color: '#ec4899' },
  { val: 'software',     label: 'Software',     icon: '💻', color: '#6366f1' },
  { val: 'gaming',       label: 'Gaming',       icon: '🎮', color: '#8b5cf6' },
  { val: 'fitness',      label: 'Fitness',      icon: '💪', color: '#22c55e' },
  { val: 'news',         label: 'News/Media',   icon: '📰', color: '#f59e0b' },
  { val: 'cloud',        label: 'Cloud/Storage',icon: '☁️', color: '#06b6d4' },
  { val: 'productivity', label: 'Productivity', icon: '📋', color: '#14b8a6' },
  { val: 'education',    label: 'Education',    icon: '📚', color: '#f97316' },
  { val: 'other',        label: 'Other',        icon: '📦', color: '#64748b' },
];

const BILLING_CYCLES = [
  { val: 'weekly',      label: 'Weekly',      mult: 4.33 },
  { val: 'monthly',     label: 'Monthly',     mult: 1    },
  { val: 'quarterly',   label: 'Quarterly',   mult: 1/3  },
  { val: 'half-yearly', label: 'Half-Yearly', mult: 1/6  },
  { val: 'yearly',      label: 'Yearly',      mult: 1/12 },
];

const POPULAR = [
  { name: 'Netflix',   icon: '🎬', color: '#ef4444', category: 'streaming',    amount: 649  },
  { name: 'Spotify',   icon: '🎵', color: '#1db954', category: 'music',        amount: 119  },
  { name: 'YouTube Premium', icon: '▶️', color: '#ff0000', category: 'streaming', amount: 189 },
  { name: 'Amazon Prime',    icon: '📦', color: '#ff9900', category: 'streaming', amount: 299 },
  { name: 'Disney+ Hotstar', icon: '⭐', color: '#006e99', category: 'streaming', amount: 299 },
  { name: 'Google One', icon: '☁️', color: '#4285f4', category: 'cloud',      amount: 130  },
  { name: 'Apple Music',icon: '🎵', color: '#fc3c44', category: 'music',       amount: 99   },
  { name: 'ChatGPT Plus',icon: '🤖',color: '#10a37f', category: 'software',   amount: 1700 },
];

const lbl = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'var(--bs-secondary-color)',
  marginBottom: 8, display: 'block',
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function dueBadgeStyle(days) {
  if (days < 0)  return { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', text: `${Math.abs(days)}d overdue` };
  if (days === 0) return { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', text: 'Due today' };
  if (days <= 3)  return { bg: 'rgba(239,68,68,0.10)',  color: '#dc2626', text: `${days}d left` };
  if (days <= 7)  return { bg: 'rgba(245,158,11,0.12)', color: '#d97706', text: `${days}d left` };
  return           { bg: 'rgba(99,102,241,0.10)',        color: '#6366f1', text: `${days}d left` };
}

// ─────────────────────────────────────────────────────────────
// Form Modal
// ─────────────────────────────────────────────────────────────
function SubFormModal({ sub, onClose, onSubmit, loading }) {
  const isEdit = !!sub;
  const defCat = CATEGORIES.find(c => c.val === sub?.category) || CATEGORIES[0];

  const [form, setForm] = useState({
    name:         sub?.name         || '',
    icon:         sub?.icon         || defCat.icon,
    color:        sub?.color        || defCat.color,
    amount:       sub?.amount       || '',
    billingCycle: sub?.billingCycle || 'monthly',
    category:     sub?.category     || 'other',
    startDate:    sub?.startDate
      ? new Date(sub.startDate).toISOString().slice(0,10)
      : new Date().toISOString().slice(0,10),
    reminderDays: sub?.reminderDays ?? 3,
    website:      sub?.website      || '',
    notes:        sub?.notes        || '',
  });
  const [errors, setErrors] = useState({});
  const [showPopular, setShowPopular] = useState(!isEdit);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const pickPopular = (p) => {
    setForm(prev => ({ ...prev, name: p.name, icon: p.icon, color: p.color,
      category: p.category, amount: String(p.amount) }));
    setShowPopular(false);
  };

  const pickCategory = (c) => set('category', c.val) || set('icon', c.icon) || set('color', c.color)
    || setForm(p => ({ ...p, category: c.val, icon: c.icon, color: c.color }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())                        e.name   = 'Name dalo';
    if (!form.amount || +form.amount <= 0)        e.amount = 'Valid amount dalo';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      name:         form.name.trim(),
      icon:         form.icon,
      color:        form.color,
      amount:       parseFloat(form.amount),
      billingCycle: form.billingCycle,
      category:     form.category,
      startDate:    form.startDate,
      reminderDays: parseInt(form.reminderDays),
      website:      form.website.trim(),
      notes:        form.notes.trim(),
    });
  };

  const monthlyEq = form.amount
    ? Math.round(parseFloat(form.amount) * (BILLING_CYCLES.find(b => b.val === form.billingCycle)?.mult || 1) * 100) / 100
    : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)', zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bs-body-bg)', borderRadius: 20,
        border: '0.5px solid var(--bs-border-color)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', flexShrink: 0, borderBottom: '0.5px solid var(--bs-border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {isEdit ? 'Edit Subscription' : 'Add Subscription'}
              </h5>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                Track and manage your renewals
              </p>
            </div>
            <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--bs-secondary-color)',lineHeight:1 }}>×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',flex:1,overflow:'hidden' }}>
          <div style={{ overflowY:'auto', flex:1, padding:'18px 22px' }}>

            {/* Popular picks */}
            {showPopular && !isEdit && (
              <div style={{ marginBottom: 18 }}>
                <span style={lbl}>Quick Pick — Popular Services</span>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                  {POPULAR.map(p => (
                    <button key={p.name} type="button" onClick={() => pickPopular(p)}
                      style={{
                        padding:'8px 4px', borderRadius:10, border:'1.5px solid var(--bs-border-color)',
                        background:'transparent', cursor:'pointer', textAlign:'center',
                        transition:'all .15s',
                      }}>
                      <div style={{ fontSize:20, marginBottom:3 }}>{p.icon}</div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--bs-body-color)' }}>{p.name}</div>
                      <div style={{ fontSize:9, color:'var(--bs-secondary-color)' }}>₹{p.amount}/mo</div>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setShowPopular(false)}
                  style={{ marginTop:8, fontSize:12, color:'var(--bs-secondary-color)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  Manual enter karein →
                </button>
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom:16 }}>
              <span style={lbl}>Category</span>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {CATEGORIES.map(c => (
                  <button key={c.val} type="button" onClick={() => pickCategory(c)}
                    style={{
                      padding:'8px 4px', borderRadius:10, textAlign:'center',
                      border: form.category===c.val ? `2px solid ${c.color}` : '1.5px solid var(--bs-border-color)',
                      background: form.category===c.val ? c.color+'15' : 'transparent',
                      cursor:'pointer', transition:'all .15s',
                    }}>
                    <div style={{ fontSize:18, marginBottom:2 }}>{c.icon}</div>
                    <div style={{ fontSize:9, fontWeight:600, color:'var(--bs-body-color)' }}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom:14 }}>
              <span style={lbl}>Service Name *</span>
              <input type="text" className={`form-control ${errors.name?'is-invalid':''}`}
                style={{ borderRadius:10 }} placeholder="e.g. Netflix, Spotify, AWS"
                value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            {/* Amount + Billing Cycle */}
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <span style={lbl}>Amount (₹) *</span>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input type="number" min="1" step="1"
                    className={`form-control ${errors.amount?'is-invalid':''}`}
                    placeholder="0" value={form.amount}
                    onChange={e => set('amount', e.target.value)} />
                </div>
                {errors.amount && <div className="text-danger small mt-1">{errors.amount}</div>}
              </div>
              <div style={{ flex:1 }}>
                <span style={lbl}>Billing Cycle</span>
                <select className="form-select" style={{ borderRadius:10 }}
                  value={form.billingCycle}
                  onChange={e => set('billingCycle', e.target.value)}>
                  {BILLING_CYCLES.map(b => (
                    <option key={b.val} value={b.val}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monthly equivalent */}
            {monthlyEq > 0 && form.billingCycle !== 'monthly' && (
              <div style={{
                marginBottom:14, padding:'8px 12px', borderRadius:8, fontSize:12,
                background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
              }}>
                <i className="bi bi-info-circle me-2 text-primary" />
                Monthly equivalent: <strong>₹{monthlyEq.toLocaleString('en-IN')}/month</strong>
                {' '}· Yearly: <strong>₹{Math.round(monthlyEq*12).toLocaleString('en-IN')}</strong>
              </div>
            )}

            {/* Start Date + Reminder */}
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <span style={lbl}>Start / Last Renewal Date</span>
                <input type="date" className="form-control" style={{ borderRadius:10 }}
                  value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </div>
              <div style={{ flex:1 }}>
                <span style={lbl}>Alert X days before renewal</span>
                <select className="form-select" style={{ borderRadius:10 }}
                  value={form.reminderDays}
                  onChange={e => set('reminderDays', e.target.value)}>
                  {[1,2,3,5,7,14].map(d => (
                    <option key={d} value={d}>{d} day{d>1?'s':''} before</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Website + Notes */}
            <div style={{ marginBottom:14 }}>
              <span style={lbl}>Website <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:12 }}>(optional)</span></span>
              <input type="url" className="form-control" style={{ borderRadius:10 }}
                placeholder="https://netflix.com" value={form.website}
                onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <span style={lbl}>Notes <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:12 }}>(optional)</span></span>
              <textarea className="form-control" style={{ borderRadius:10,fontSize:13 }}
                rows={2} placeholder="Account info, plan name…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:'12px 22px', flexShrink:0, borderTop:'0.5px solid var(--bs-border-color)',
            display:'flex', justifyContent:'flex-end', gap:10, background:'var(--bs-body-bg)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn ef-btn-primary" disabled={loading} style={{ minWidth:140 }}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                : <><i className={`bi ${isEdit?'bi-check-lg':'bi-plus-lg'} me-2`} />{isEdit?'Update':'Add Subscription'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subscription Card
// ─────────────────────────────────────────────────────────────
function SubCard({ sub, onEdit, onDelete, onRenew, onCancel, onToggle, format }) {
  const days  = daysUntil(sub.nextRenewal);
  const badge = dueBadgeStyle(days);
  const monthlyEq = sub.monthlyEquivalent ||
    Math.round(sub.amount * (BILLING_CYCLES.find(b=>b.val===sub.billingCycle)?.mult||1)*100)/100;
  const cycle = BILLING_CYCLES.find(b => b.val === sub.billingCycle);
  const cat   = CATEGORIES.find(c => c.val === sub.category);

  return (
    <div style={{
      background:'var(--bs-body-bg)',
      border: sub.isCancelled ? '0.5px solid var(--bs-border-color)' :
              days <= 3 ? '1.5px solid rgba(239,68,68,0.4)' :
              days <= 7 ? '1.5px solid rgba(245,158,11,0.3)' :
              '0.5px solid var(--bs-border-color)',
      borderRadius:16, padding:'16px 18px',
      opacity: sub.isCancelled||!sub.isActive ? 0.6 : 1,
      display:'flex', flexDirection:'column', height:'100%',
    }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
        <div style={{
          width:44, height:44, borderRadius:12, fontSize:24, flexShrink:0,
          background: sub.color+'20', color: sub.color,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{sub.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ fontWeight:700, fontSize:15 }} className="text-truncate">{sub.name}</div>
            {sub.isCancelled && (
              <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                background:'rgba(239,68,68,0.1)',color:'#dc2626',flexShrink:0 }}>Cancelled</span>
            )}
            {!sub.isActive && !sub.isCancelled && (
              <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                background:'rgba(100,116,139,0.1)',color:'#64748b',flexShrink:0 }}>Paused</span>
            )}
          </div>
          <div style={{ fontSize:12, color:'var(--bs-secondary-color)', marginTop:2 }}>
            {cat?.icon} {cat?.label}
          </div>
        </div>
        {/* Toggle */}
        {!sub.isCancelled && (
          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox"
              checked={sub.isActive} onChange={() => onToggle(sub)} />
          </div>
        )}
      </div>

      {/* Amount */}
      <div style={{ marginBottom:10 }}>
        <span style={{ fontSize:22,fontWeight:800 }}>₹{sub.amount.toLocaleString('en-IN')}</span>
        <span style={{ fontSize:12,color:'var(--bs-secondary-color)',marginLeft:6 }}>
          / {cycle?.label || sub.billingCycle}
        </span>
        {sub.billingCycle !== 'monthly' && (
          <div style={{ fontSize:11,color:'var(--bs-secondary-color)',marginTop:2 }}>
            ≈ ₹{monthlyEq.toLocaleString('en-IN')}/month
          </div>
        )}
      </div>

      {/* Badges */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {!sub.isCancelled && (
          <span style={{ ...badge, fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
            background:badge.bg, color:badge.color }}>
            <i className="bi bi-calendar3 me-1" style={{ fontSize:10 }} />
            {badge.text}
          </span>
        )}
        <span style={{ fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
          background:'rgba(99,102,241,0.1)',color:'#6366f1' }}>
          ₹{Math.round(monthlyEq*12).toLocaleString('en-IN')}/year
        </span>
      </div>

      {/* Next renewal date */}
      {!sub.isCancelled && (
        <div style={{ fontSize:12,color:'var(--bs-secondary-color)',marginBottom:12 }}>
          <i className="bi bi-arrow-clockwise me-1" />
          Next: {new Date(sub.nextRenewal).toLocaleDateString('en-IN', { day:'2-digit',month:'short',year:'numeric' })}
        </div>
      )}

      {sub.notes && (
        <div style={{ fontSize:11,color:'var(--bs-secondary-color)',marginBottom:10,fontStyle:'italic' }}>
          <i className="bi bi-sticky me-1" />{sub.notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop:'auto',paddingTop:12,borderTop:'0.5px solid var(--bs-border-color)',
        display:'flex',gap:8,flexWrap:'wrap' }}>
        {!sub.isCancelled && sub.isActive && (
          <button className="btn btn-sm ef-btn-primary" style={{ flex:1,borderRadius:8 }}
            onClick={() => onRenew(sub._id, sub.name)}>
            <i className="bi bi-arrow-clockwise me-1" />Renew
          </button>
        )}
        <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius:8 }}
          onClick={() => onEdit(sub)}><i className="bi bi-pencil" /></button>
        {!sub.isCancelled && (
          <button className="btn btn-sm btn-outline-warning" style={{ borderRadius:8 }}
            onClick={() => onCancel(sub._id, sub.name)} title="Cancel subscription">
            <i className="bi bi-x-circle" />
          </button>
        )}
        <button className="btn btn-sm btn-outline-danger" style={{ borderRadius:8 }}
          onClick={() => onDelete(sub._id)}><i className="bi bi-trash" /></button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const {
    subs, dueSubs, summary, loading, submitting,
    addSub, updateSub, renewSub, cancelSub, deleteSub, toggleActive,
  } = useSubscription();
  const { format } = useCurrency();

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [filter,   setFilter]   = useState('active');

  const handleSubmit = async (payload) => {
    const ok = editing ? await updateSub(editing._id, payload) : await addSub(payload);
    if (ok) { setShowForm(false); setEditing(null); }
  };

  const handleDelete = (id) => {
    if (window.confirm('Subscription delete karein?')) deleteSub(id);
  };

  const handleCancel = (id, name) => {
    if (window.confirm(`"${name}" cancel karein? Yeh record mein rahega.`)) cancelSub(id, name);
  };

  const activeSubs    = subs.filter(s => s.isActive && !s.isCancelled);
  const cancelledSubs = subs.filter(s => s.isCancelled);

  const filteredSubs = filter === 'active'    ? activeSubs
                     : filter === 'cancelled' ? cancelledSubs
                     : subs;

  return (
    <div className="ef-page">
      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Subscriptions</h4>
          <p className="text-muted small mb-0">
            {activeSubs.length} active
            {dueSubs.length > 0 && (
              <span className="ms-2 badge bg-warning text-dark">
                <i className="bi bi-bell-fill me-1" style={{ fontSize:10 }} />
                {dueSubs.length} due soon
              </span>
            )}
          </p>
        </div>
        <button className="btn ef-btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">Add Subscription</span>
          <span className="d-sm-none">Add</span>
        </button>
      </div>

      {/* Summary */}
      {summary && subs.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            { icon:'bi-collection',   color:'#6366f1', bg:'rgba(99,102,241,0.1)',  label:'Active Subs',     val: activeSubs.length },
            { icon:'bi-calendar-month',color:'#22c55e',bg:'rgba(34,197,94,0.1)',   label:'Monthly Total',   val:`₹${Math.round(summary.monthlyTotal).toLocaleString('en-IN')}` },
            { icon:'bi-calendar-year', color:'#f59e0b',bg:'rgba(245,158,11,0.1)', label:'Yearly Total',    val:`₹${Math.round(summary.yearlyTotal).toLocaleString('en-IN')}` },
            { icon:'bi-bell-fill',     color:'#ef4444', bg:'rgba(239,68,68,0.1)', label:'Due in 7 days',   val: dueSubs.length || 0 },
          ].map(({ icon,color,bg,label,val }) => (
            <div className="col-6 col-md-3" key={label}>
              <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:14, padding:16 }}>
                <div style={{ width:36,height:36,borderRadius:10,background:bg,color,
                  display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10,fontSize:17 }}>
                  <i className={`bi ${icon}`} />
                </div>
                <div style={{ fontSize:12,color:'var(--bs-secondary-color)',marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:18,fontWeight:800 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Due Soon Banner */}
      {dueSubs.length > 0 && (
        <div style={{ borderRadius:14, border:'1.5px solid rgba(245,158,11,0.4)',
          background:'rgba(245,158,11,0.04)', marginBottom:24, overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', background:'rgba(245,158,11,0.1)',
            borderBottom:'0.5px solid rgba(245,158,11,0.3)',
            display:'flex',alignItems:'center',gap:8 }}>
            <i className="bi bi-bell-fill text-warning" />
            <strong style={{ fontSize:14 }}>Renewal Alerts — Next 7 Days</strong>
            <span style={{ background:'#f59e0b',color:'#fff',borderRadius:20,
              padding:'1px 8px',fontSize:12,fontWeight:700,marginLeft:4 }}>{dueSubs.length}</span>
          </div>
          {dueSubs.map((sub, idx) => {
            const d = daysUntil(sub.nextRenewal);
            const b = dueBadgeStyle(d);
            return (
              <div key={sub._id} style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 20px',
                borderBottom: idx<dueSubs.length-1 ? '0.5px solid rgba(245,158,11,0.15)' : 'none' }}>
                <div style={{ width:40,height:40,borderRadius:10,fontSize:22,flexShrink:0,
                  background:sub.color+'20',color:sub.color,
                  display:'flex',alignItems:'center',justifyContent:'center' }}>{sub.icon}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14 }}>{sub.name}</div>
                  <div style={{ fontSize:12,color:'var(--bs-secondary-color)' }}>
                    {new Date(sub.nextRenewal).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                    <span style={{ marginLeft:8,...b,fontSize:11,fontWeight:700,
                      padding:'1px 7px',borderRadius:20,background:b.bg,color:b.color }}>{b.text}</span>
                  </div>
                </div>
                <div style={{ fontWeight:800,fontSize:16,flexShrink:0 }}>
                  ₹{sub.amount.toLocaleString('en-IN')}
                </div>
                <button className="btn btn-sm ef-btn-primary" style={{ borderRadius:8,flexShrink:0 }}
                  onClick={() => renewSub(sub._id, sub.name)}>
                  <i className="bi bi-check-lg me-1" />Renewed
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter tabs */}
      {subs.length > 0 && (
        <div style={{ display:'flex',gap:6,marginBottom:20,
          borderBottom:'0.5px solid var(--bs-border-color)',paddingBottom:12 }}>
          {[
            { val:'active',    label:`Active (${activeSubs.length})` },
            { val:'cancelled', label:`Cancelled (${cancelledSubs.length})` },
            { val:'all',       label:`All (${subs.length})` },
          ].map(t => (
            <button key={t.val} type="button" onClick={() => setFilter(t.val)} style={{
              padding:'6px 16px',borderRadius:20,fontSize:13,fontWeight:600,
              border: filter===t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
              background: filter===t.val ? 'var(--bs-primary)' : 'transparent',
              color: filter===t.val ? '#fff' : 'var(--bs-secondary-color)',
              cursor:'pointer',transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width:40,height:40 }} />
        </div>
      ) : subs.length === 0 ? (
        <div style={{ textAlign:'center',padding:'60px 20px',background:'var(--bs-body-bg)',
          border:'0.5px solid var(--bs-border-color)',borderRadius:16 }}>
          <div style={{ fontSize:56,marginBottom:16 }}>📦</div>
          <h5 style={{ fontWeight:700,marginBottom:8 }}>No subscriptions yet</h5>
          <p className="text-muted" style={{ maxWidth:300,margin:'0 auto 20px' }}>
            Track Netflix, Spotify, AWS and all your subscriptions — get renewal alerts
          </p>
          <button className="btn ef-btn-primary" style={{ borderRadius:10,padding:'10px 24px' }}
            onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg me-2" />Add First Subscription
          </button>
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-filter-circle fs-2 d-block mb-2" />No subscriptions in this filter
        </div>
      ) : (
        <div className="row g-3">
          {filteredSubs.map(sub => (
            <div className="col-12 col-md-6 col-lg-4" key={sub._id}>
              <SubCard sub={sub} format={format}
                onEdit={s => { setEditing(s); setShowForm(true); }}
                onDelete={handleDelete} onRenew={renewSub}
                onCancel={handleCancel} onToggle={toggleActive} />
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SubFormModal sub={editing} loading={submitting}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit} />
      )}
    </div>
  );
}