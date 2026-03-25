import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ExpenseFormModal({ categories, expense, onClose, onSubmit, loading }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    category:    expense?.category?._id || '',
    amount:      expense?.amount || '',
    description: expense?.description || '',
    notes:       expense?.notes || '',
    date:        expense?.date ? new Date(expense.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  });
  const [descriptions, setDescriptions] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (form.category) {
      api.get(`/categories/${form.category}/descriptions`)
        .then(r => setDescriptions(r.data.data || []))
        .catch(() => setDescriptions([]));
    } else {
      setDescriptions([]);
    }
  }, [form.category]);

  const validate = () => {
    const e = {};
    if (!form.category)    e.category    = 'Select a category';
    if (!form.amount || +form.amount <= 0) e.amount = 'Enter valid amount';
    if (!form.description) e.description = 'Enter description';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, amount: parseFloat(form.amount), date: new Date(form.date).toISOString() });
  };

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => { const n = { ...p }; delete n[k]; return n; }); };
  const selCat = categories.find(c => c._id === form.category);

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content ef-modal">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="ef-modal-icon"><i className="bi bi-receipt-cutoff" /></div>
                <div>
                  <h5 className="modal-title mb-0">{isEdit ? 'Edit Expense' : 'Add New Expense'}</h5>
                  <small className="text-muted">Quick expense entry</small>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Category */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Category *</label>
                  <div className="ef-cat-grid">
                    {categories.map(cat => (
                      <button type="button" key={cat._id}
                        className={`ef-cat-btn ${form.category === cat._id ? 'ef-cat-btn--active' : ''}`}
                        style={{ '--cat-color': cat.color }}
                        onClick={() => { set('category', cat._id); set('description', ''); }}>
                        <span className="ef-cat-btn__icon">{cat.icon}</span>
                        <span className="ef-cat-btn__name">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <div className="text-danger small mt-1">{errors.category}</div>}
                </div>

                {/* Description */}
                {form.category && (
                  <div className="mb-3">
                    <label className="form-label fw-medium">Description *</label>
                    <select className={`form-select ${errors.description ? 'is-invalid' : ''}`}
                      value={form.description} onChange={e => set('description', e.target.value)}>
                      <option value="">Select description…</option>
                      {descriptions.map(d => <option key={d} value={d}>{d}</option>)}
                      <option value="__other__">Other (type below)</option>
                    </select>
                    {form.description === '__other__' && (
                      <input type="text" className="form-control mt-2" placeholder="Enter custom description"
                        onChange={e => set('description', e.target.value)} autoFocus />
                    )}
                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                  </div>
                )}

                {/* Amount + Date row */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-medium">Amount (₹) *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                        value={form.amount} onChange={e => set('amount', e.target.value)} />
                      {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium">Date & Time</label>
                    <input type="datetime-local" className="form-control"
                      value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Notes <span className="text-muted">(optional)</span></label>
                  <textarea className="form-control" rows={2} placeholder="Any additional details…"
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                {/* Preview */}
                {form.category && form.amount && (
                  <div className="ef-expense-preview">
                    <span className="ef-cat-badge" style={{ background: selCat?.color + '22', color: selCat?.color }}>
                      {selCat?.icon} {selCat?.name}
                    </span>
                    <span className="fw-bold">₹{parseFloat(form.amount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn ef-btn-primary" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-plus-lg'} me-2`} />}
                  {isEdit ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
