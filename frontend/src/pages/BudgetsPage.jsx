import { useState } from 'react';
import { useBudgets }    from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useCurrency }   from '../hooks/useCurrency';
import { useSalary }     from '../hooks/useSalary';
import BudgetFormModal   from '../components/budgets/BudgetFormModal';

export default function BudgetsPage() {
  const { budgets, loading, submitting, addBudget, updateBudget, deleteBudget } = useBudgets();
  const { categories }    = useCategories();
  const { format, isUSD } = useCurrency();
  const { hasSalary, salary, getBudgetSalaryPct, format: fmtSalary } = useSalary();

  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [filter,    setFilter]    = useState('all');

  const totalBudgeted   = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent      = budgets.reduce((s, b) => s + b.spent,    0);
  const totalRemaining  = totalBudgeted - totalSpent;
  const budgetSalaryPct = getBudgetSalaryPct(totalBudgeted);
  const overCount       = budgets.filter(b => b.isExceeded).length;
  const onTrackCount    = budgets.length - overCount;

  const handleSubmit = async (payload) => {
    const ok = editing
      ? await updateBudget(editing.budgetId, payload)
      : await addBudget(payload);
    if (ok) { setShowModal(false); setEditing(null); }
  };

  const confirmDelete = (id) => {
    if (window.confirm('Delete this budget?')) deleteBudget(id);
  };

  const filteredBudgets = budgets.filter(b => {
    if (filter === 'over')     return b.isExceeded;
    if (filter === 'on-track') return !b.isExceeded;
    return true;
  });

  return (
    <div className="ef-page">

      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Budgets</h4>
          <p className="text-muted small mb-0">
            {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
            {overCount > 0 && (
              <span className="ms-2 badge bg-danger" style={{ fontSize: 10 }}>
                {overCount} over limit
              </span>
            )}
            {isUSD && (
              <span className="ms-2 badge bg-info bg-opacity-10 text-info" style={{ fontSize: 10 }}>USD</span>
            )}
          </p>
        </div>
        <button className="btn ef-btn-primary"
          onClick={() => { setEditing(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1 me-md-2" />
          <span className="d-none d-sm-inline">Create Budget</span>
          <span className="d-sm-none">Add</span>
        </button>
      </div>

      {/* Salary Banner */}
      {hasSalary && budgets.length > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        }}>
          <i className="bi bi-wallet2 text-info" style={{ fontSize: 18, flexShrink: 0 }} />
          <div style={{ flex: '1 1 140px' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              Salary: {fmtSalary(salary)}/month
            </div>
            {budgetSalaryPct !== null && (
              <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 2 }}>
                <strong>{budgetSalaryPct}%</strong> of salary budgeted
              </div>
            )}
          </div>
          {budgetSalaryPct !== null && (
            <div style={{ flex: '1 1 100px', minWidth: 80 }}>
              <div style={{ height: 6, borderRadius: 6, background: 'var(--bs-border-color)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 6,
                  width: `${Math.min(budgetSalaryPct, 100)}%`,
                  background: budgetSalaryPct > 90 ? '#ef4444' : budgetSalaryPct > 70 ? '#f59e0b' : '#06b6d4',
                  transition: 'width .4s',
                }} />
              </div>
            </div>
          )}
          {budgetSalaryPct !== null && budgetSalaryPct < 100 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(34,197,94,0.12)', color: '#16a34a', flexShrink: 0,
            }}>
              {100 - budgetSalaryPct}% unbudgeted
            </span>
          )}
        </div>
      )}

      {/* Summary Cards — always 3 columns, scales text on small screens */}
      {budgets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { icon: 'bi-wallet2',   color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  label: 'Budget',    val: format(totalBudgeted) },
            { icon: 'bi-graph-up',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Spent',     val: format(totalSpent) },
            {
              icon: 'bi-piggy-bank',
              color: totalRemaining < 0 ? '#ef4444' : '#22c55e',
              bg:    totalRemaining < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              label: 'Remaining',  val: format(Math.abs(totalRemaining)),
              sub:   totalRemaining < 0 ? 'over' : 'left',
            },
          ].map(({ icon, color, bg, label, val, sub }) => (
            <div key={label} style={{
              background: 'var(--bs-body-bg)', border: '0.5px solid var(--bs-border-color)',
              borderRadius: 12, padding: '12px 10px',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: bg, color,
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <i className={`bi ${icon}`} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {val}
              </div>
              {sub && <div style={{ fontSize: 9, color, opacity: .75, marginTop: 1 }}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      {budgets.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap',
          borderBottom: '0.5px solid var(--bs-border-color)', paddingBottom: 12,
        }}>
          {[
            { val: 'all',      label: `All (${budgets.length})` },
            { val: 'over',     label: `Over limit (${overCount})` },
            { val: 'on-track', label: `On track (${onTrackCount})` },
          ].map(t => (
            <button key={t.val} type="button" onClick={() => setFilter(t.val)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: filter === t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
              background: filter === t.val ? 'var(--bs-primary)' : 'transparent',
              color: filter === t.val ? '#fff' : 'var(--bs-secondary-color)',
              cursor: 'pointer', transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* Budget Cards */}
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

      ) : filteredBudgets.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-filter-circle fs-2 d-block mb-2" />
          No budgets in this filter
        </div>

      ) : (
        <div className="row g-3">
          {filteredBudgets.map(b => {
            const pct      = b.percentageUsed || 0;
            const over     = b.isExceeded;
            const barColor = over ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e';
            const salaryPct = hasSalary && salary > 0
              ? Math.round((b.budgeted / salary) * 100) : null;

            return (
              <div className="col-12 col-sm-6 col-lg-4" key={b.budgetId}>
                <div style={{
                  background: 'var(--bs-body-bg)',
                  border: over ? '1.5px solid rgba(239,68,68,0.35)' : '0.5px solid var(--bs-border-color)',
                  borderRadius: 14, padding: '16px',
                  height: '100%', display: 'flex', flexDirection: 'column',
                }}>

                  {/* Top — icon / name / actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>

                    {/* Icon + Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: b.categoryColor + '20', color: b.categoryColor,
                        fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {b.categoryIcon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }} className="text-truncate">
                          {b.categoryName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                          <i className="bi bi-calendar3" style={{ fontSize: 10 }} />
                          <span className="text-capitalize">{b.period}</span>
                          {salaryPct !== null && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                              background: 'rgba(100,116,139,0.1)', color: '#64748b',
                            }}>{salaryPct}% salary</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {over && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                          Over!
                        </span>
                      )}
                      <button
                        onClick={() => { setEditing(b); setShowModal(true); }}
                        title="Edit"
                        style={{
                          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                          border: '1px solid var(--bs-border-color)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--bs-secondary-color)',
                        }}
                      >
                        <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                      </button>
                      <button
                        onClick={() => confirmDelete(b.budgetId)}
                        title="Delete"
                        style={{
                          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                          border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#ef4444',
                        }}
                      >
                        <i className="bi bi-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </div>

                  {/* Progress label row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--bs-secondary-color)' }}>{pct.toFixed(0)}% used</span>
                    <span style={{ color: over ? '#ef4444' : '#22c55e' }}>
                      {over ? `${format(Math.abs(b.remaining))} over` : `${format(b.remaining)} left`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 10, borderRadius: 10, background: 'var(--bs-border-color)', overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{
                      height: '100%', borderRadius: 10, background: barColor,
                      width: `${Math.min(pct, 100)}%`, transition: 'width .4s ease',
                    }} />
                  </div>

                  {/* 3-stat footer */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 4, marginTop: 'auto',
                    paddingTop: 12, borderTop: '0.5px solid var(--bs-border-color)',
                  }}>
                    {[
                      { label: 'Spent',     val: format(b.spent),             color: '#ef4444' },
                      { label: 'Budget',    val: format(b.budgeted),          color: 'var(--bs-body-color)' },
                      { label: 'Left',      val: format(Math.abs(b.remaining)), color: b.remaining < 0 ? '#ef4444' : '#22c55e' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 800, fontSize: 12, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetFormModal
          categories={categories}
          budget={editing}
          existingBudgetCategoryIds={budgets
            .filter(b => b.budgetId !== editing?.budgetId)
            .map(b => b.categoryId?.toString())}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      )}
    </div>
  );
}