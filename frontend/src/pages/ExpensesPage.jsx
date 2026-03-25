import { useState } from 'react';
import { useExpenses }   from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useCurrency }   from '../hooks/useCurrency';
import { useSalary }     from '../hooks/useSalary';
import ExpenseFormModal  from '../components/expenses/ExpenseFormModal';

export default function ExpensesPage() {
  const [days, setDays]           = useState(30);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const { expenses, loading, addExpense, deleteExpense, updateExpense, submitting } = useExpenses(days);
  const { categories }            = useCategories();
  const { format, isUSD }         = useCurrency();
  const { hasSalary, getSavingsInfo, salary, format: fmtSalary } = useSalary();

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !catFilter || e.category?._id === catFilter;
    return matchSearch && matchCat;
  });

  // Total spent from ALL expenses (not just filtered) for salary calc
  const totalSpent  = expenses.reduce((s, e) => s + e.amount, 0);
  const savingsInfo = getSavingsInfo(totalSpent);

  const handleAdd = async (payload) => {
    if (editing) await updateExpense(editing._id, payload);
    else         await addExpense(payload);
    setShowModal(false); setEditing(null);
  };

  const confirmDelete = (id) => {
    if (window.confirm('Delete this expense?')) deleteExpense(id);
  };

  return (
    <div className="ef-page">
      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Expenses</h4>
          <p className="text-muted small mb-0">
            {filtered.length} transactions
            {isUSD && <span className="ms-2 badge bg-info bg-opacity-10 text-info">Showing in USD</span>}
          </p>
        </div>
        <button className="btn ef-btn-primary ef-btn-add"
          onClick={() => { setEditing(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">Add Expense</span>
          <span className="d-sm-none">Add</span>
        </button>
      </div>

      {/* ── Salary savings banner (only if salary set) ── */}
      {hasSalary && savingsInfo && !loading && (
        <div className={`alert ${savingsInfo.isOver ? 'alert-danger' : 'alert-success'} d-flex align-items-center gap-3 py-2 mb-3`}>
          <i className={`bi ${savingsInfo.isOver ? 'bi-exclamation-triangle-fill' : 'bi-piggy-bank-fill'} fs-5 flex-shrink-0`} />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <span>
                <strong>{savingsInfo.formattedSaved}</strong>
                <span className="ms-1 text-muted small">
                  {savingsInfo.isOver ? 'over salary' : 'remaining from salary'}
                </span>
              </span>
              <span className="small fw-semibold">
                {savingsInfo.spentPct}% of {fmtSalary(salary)} spent
              </span>
            </div>
            <div className="progress mt-1" style={{ height: 5 }}>
              <div
                className={`progress-bar ${savingsInfo.isOver ? 'bg-danger' : savingsInfo.spentPct > 80 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(savingsInfo.spentPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card ef-card mb-4">
        <div className="card-body py-2 px-3">
          <div className="row g-2">
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder="Search…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>
            <div className="col-6 col-md-4">
              <select className="form-select form-select-sm" value={catFilter}
                onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select form-select-sm" value={days}
                onChange={e => setDays(+e.target.value)}>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="ef-empty-state card">
          <i className="bi bi-receipt ef-empty-icon" />
          <h5>No expenses found</h5>
          <p className="text-muted">Try adjusting filters or add a new expense</p>
          <button className="btn ef-btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg me-2" />Add First Expense
          </button>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="card ef-card d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="ef-table-head">
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount {isUSD && <span className="badge bg-info bg-opacity-10 text-info ms-1">USD</span>}</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e._id} className="ef-table-row">
                      <td>
                        <span className="ef-cat-badge"
                          style={{ background: e.category?.color + '22', color: e.category?.color }}>
                          {e.category?.icon} {e.category?.name}
                        </span>
                      </td>
                      <td className="fw-medium">{e.description}</td>
                      <td>
                        <span className="ef-amount fw-bold">{format(e.amount)}</span>
                        {isUSD && (
                          <div className="text-muted" style={{ fontSize: 11 }}>₹{e.amount.toLocaleString('en-IN')}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-muted small">
                          {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td><span className="text-muted small">{e.notes || '—'}</span></td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary ef-action-btn"
                            onClick={() => { setEditing(e); setShowModal(true); }}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-outline-danger ef-action-btn"
                            onClick={() => confirmDelete(e._id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="d-md-none ef-expense-cards">
            {filtered.map(e => (
              <div key={e._id} className="card ef-card ef-expense-card">
                <div className="card-body py-3 px-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1 me-2">
                      <span className="ef-cat-badge mb-1 d-inline-flex"
                        style={{ background: e.category?.color + '22', color: e.category?.color }}>
                        {e.category?.icon} {e.category?.name}
                      </span>
                      <div className="fw-semibold">{e.description}</div>
                      <div className="text-muted small mt-1">
                        <i className="bi bi-calendar3 me-1" />
                        {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {e.notes && <span className="ms-2"><i className="bi bi-sticky me-1" />{e.notes}</span>}
                      </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="ef-amount fw-bold fs-6">{format(e.amount)}</div>
                      {isUSD && (
                        <div className="text-muted" style={{ fontSize: 11 }}>₹{e.amount.toLocaleString('en-IN')}</div>
                      )}
                      <div className="btn-group btn-group-sm mt-2">
                        <button className="btn btn-outline-secondary"
                          onClick={() => { setEditing(e); setShowModal(true); }}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-outline-danger"
                          onClick={() => confirmDelete(e._id)}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <ExpenseFormModal
          categories={categories} expense={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleAdd} loading={submitting}
        />
      )}
    </div>
  );
}