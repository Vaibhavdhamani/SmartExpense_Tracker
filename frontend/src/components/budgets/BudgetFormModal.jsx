import { useState } from 'react';

export default function BudgetFormModal({ categories, budget, existingBudgetCategoryIds = [], onClose, onSubmit, loading }) {
  const isEdit = !!budget;
  const [form, setForm] = useState({
    category:  budget?.categoryId || '',
    amount:    budget?.budgeted || '',
    period:    budget?.period || 'monthly',
    startDate: budget?.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.category) e.category = 'Select a category';
    if (!form.amount || +form.amount <= 0) e.amount = 'Enter valid amount';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ category: form.category, amount: parseFloat(form.amount), period: form.period, startDate: form.startDate });
  };

  // Filter out already-budgeted categories (unless editing)
  const availableCats = isEdit
    ? categories
    : categories.filter(c => !existingBudgetCategoryIds.includes(c._id?.toString()));

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content ef-modal">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="ef-modal-icon"><i className="bi bi-bullseye" /></div>
                <h5 className="modal-title mb-0">{isEdit ? 'Edit Budget' : 'Create Budget'}</h5>
              </div>
              <button className="btn-close" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Category */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Category *</label>
                  <select className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                    value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    disabled={isEdit}>
                    <option value="">Select category…</option>
                    {availableCats.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                  {!isEdit && availableCats.length === 0 && (
                    <div className="text-warning small mt-1"><i className="bi bi-info-circle me-1" />All categories already have budgets.</div>
                  )}
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Budget Amount (₹) *</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                      value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                    {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                  </div>
                </div>

                {/* Period */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Period *</label>
                  <select className="form-select" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="mb-3">
                  <label className="form-label fw-medium">Start Date *</label>
                  <input type="date" className="form-control"
                    value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn ef-btn-primary" disabled={loading || (!isEdit && availableCats.length === 0)}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-plus-lg'} me-2`} />}
                  {isEdit ? 'Update Budget' : 'Create Budget'}
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
