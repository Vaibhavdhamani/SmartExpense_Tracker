import { useState } from 'react';
import { useBudgets }    from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useCurrency }   from '../hooks/useCurrency';
import { useSalary }     from '../hooks/useSalary';
import BudgetFormModal   from '../components/budgets/BudgetFormModal';

export default function BudgetsPage() {
  const { budgets, loading, submitting, addBudget, updateBudget, deleteBudget } = useBudgets();
  const { categories }                          = useCategories();
  const { format, isUSD }                       = useCurrency();
  const { hasSalary, salary, getBudgetSalaryPct, format: fmtSalary } = useSalary();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const totalBudgeted  = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent     = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  // % of salary that is budgeted
  const budgetSalaryPct = getBudgetSalaryPct(totalBudgeted);

  const handleSubmit = async (payload) => {
    const ok = editing
      ? await updateBudget(editing.budgetId, payload)
      : await addBudget(payload);
    if (ok) { setShowModal(false); setEditing(null); }
  };

  const confirmDelete = (id) => {
    if (window.confirm('Delete this budget?')) deleteBudget(id);
  };

  return (
    <div className="ef-page">
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Budgets</h4>
          <p className="text-muted small mb-0">
            {budgets.length} active budget{budgets.length !== 1 ? 's' : ''}
            {isUSD && <span className="ms-2 badge bg-info bg-opacity-10 text-info">Showing in USD</span>}
          </p>
        </div>
        <button className="btn ef-btn-primary"
          onClick={() => { setEditing(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">Create Budget</span>
          <span className="d-sm-none">Create</span>
        </button>
      </div>

      {/* ── Salary banner (only if salary is set) ── */}
      {hasSalary && budgets.length > 0 && (
        <div className="alert alert-info d-flex align-items-center gap-3 py-2 mb-3">
          <i className="bi bi-wallet2 fs-5 flex-shrink-0" />
          <div className="flex-grow-1">
            <strong>Salary: {fmtSalary(salary)}/month</strong>
            {budgetSalaryPct !== null && (
              <>
                <span className="ms-2 text-muted small">
                  — <strong>{budgetSalaryPct}%</strong> of salary budgeted
                </span>
                <div className="progress mt-1" style={{ height: 4 }}>
                  <div
                    className={`progress-bar ${budgetSalaryPct > 90 ? 'bg-danger' : budgetSalaryPct > 70 ? 'bg-warning' : 'bg-info'}`}
                    style={{ width: `${Math.min(budgetSalaryPct, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
          {budgetSalaryPct !== null && budgetSalaryPct < 100 && (
            <span className="badge bg-success bg-opacity-10 text-success flex-shrink-0">
              {100 - budgetSalaryPct}% unbudgeted
            </span>
          )}
        </div>
      )}

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            { icon: 'bi-wallet2',    color: 'primary', label: 'Total Budget',  val: totalBudgeted },
            { icon: 'bi-graph-up',   color: 'warning', label: 'Total Spent',   val: totalSpent },
            { icon: 'bi-piggy-bank', color: totalRemaining < 0 ? 'danger' : 'success', label: 'Remaining', val: Math.abs(totalRemaining) },
          ].map(({ icon, color, label, val }) => (
            <div className="col-4" key={label}>
              <div className={`card ef-card border-${color} border-opacity-25 ef-summary-card`}>
                <div className="card-body py-3 d-flex align-items-center gap-2 gap-md-3">
                  <div className={`ef-kpi-icon bg-${color} bg-opacity-10 text-${color}`}>
                    <i className={`bi ${icon}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="small text-muted text-truncate">{label}</div>
                    <div className="fw-bold">{format(val)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : budgets.length === 0 ? (
        <div className="ef-empty-state card">
          <i className="bi bi-bullseye ef-empty-icon" />
          <h5>No budgets yet</h5>
          <p className="text-muted">Create budgets to track your spending limits</p>
          <button className="btn ef-btn-primary" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg me-2" />Create First Budget
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {budgets.map(b => {
            const pct  = b.percentageUsed;
            const over = b.isExceeded;
            // Per-budget salary %
            const perBudgetSalaryPct = hasSalary && salary > 0
              ? Math.round((b.budgeted / salary) * 100)
              : null;

            return (
              <div className="col-12 col-md-6 col-lg-4" key={b.budgetId}>
                <div className={`card ef-card ef-budget-card ${over ? 'ef-budget-card--exceeded' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="ef-budget-icon"
                          style={{ background: b.categoryColor + '22', color: b.categoryColor }}>
                          {b.categoryIcon}
                        </span>
                        <div>
                          <div className="fw-semibold">{b.categoryName}</div>
                          <small className="text-muted text-capitalize">
                            <i className="bi bi-calendar3 me-1" />{b.period}
                            {perBudgetSalaryPct !== null && (
                              <span className="ms-2 badge bg-secondary bg-opacity-10 text-secondary">
                                {perBudgetSalaryPct}% of salary
                              </span>
                            )}
                          </small>
                        </div>
                      </div>
                      <div className="d-flex gap-1 align-items-center">
                        {over && <span className="badge bg-danger"><i className="bi bi-exclamation-triangle" /></span>}
                        <button className="btn btn-sm btn-outline-secondary ef-action-btn"
                          onClick={() => { setEditing(b); setShowModal(true); }}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger ef-action-btn"
                          onClick={() => confirmDelete(b.budgetId)}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">{pct.toFixed(0)}% used</span>
                      {over
                        ? <span className="text-danger fw-semibold">{format(Math.abs(b.remaining))} over</span>
                        : <span className="text-success fw-semibold">{format(b.remaining)} left</span>}
                    </div>
                    <div className="progress mb-3" style={{ height: 8 }}>
                      <div
                        className={`progress-bar ${over ? 'bg-danger' : pct > 75 ? 'bg-warning' : 'bg-success'} ef-progress-bar`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>

                    <div className="d-flex justify-content-between text-center">
                      {[
                        { label: 'Spent',     val: b.spent,             cls: 'text-danger' },
                        { label: 'Budget',    val: b.budgeted,           cls: '' },
                        { label: 'Remaining', val: Math.abs(b.remaining), cls: b.remaining < 0 ? 'text-danger' : 'text-success' },
                      ].map(({ label, val, cls }) => (
                        <div key={label}>
                          <div className="small text-muted">{label}</div>
                          <div className={`fw-bold small ${cls}`}>{format(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetFormModal
          categories={categories} budget={editing}
          existingBudgetCategoryIds={budgets
            .filter(b => b.budgetId !== editing?.budgetId)
            .map(b => b.categoryId?.toString())}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSubmit} loading={submitting}
        />
      )}
    </div>
  );
}