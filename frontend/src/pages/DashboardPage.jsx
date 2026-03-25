import { useState, useMemo } from 'react';
import { useExpenses }  from '../hooks/useExpenses';
import { useBudgets }   from '../hooks/useBudgets';
import { useCurrency }  from '../hooks/useCurrency';
import { useSalary }    from '../hooks/useSalary';
import KPICard          from '../components/dashboard/KPICard';
import DonutChart       from '../components/dashboard/DonutChart';
import DailyBarChart    from '../components/dashboard/DailyBarChart';
import BudgetAlerts     from '../components/budgets/BudgetAlerts';

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const { expenses, summary, loading: expLoading } = useExpenses(days);
  const { budgets, loading: budLoading }           = useBudgets();
  const { format, isUSD }                          = useCurrency();
  const { hasSalary, getSavingsInfo }              = useSalary();

  const totalBudgeted   = budgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent      = budgets.reduce((s, b) => s + b.spent, 0);
  const budgetPct       = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const budgetRemaining = totalBudgeted - totalSpent;

  // Savings info based on salary vs actual spending
  const savingsInfo = getSavingsInfo(summary?.totalSpending || 0);

  const trendPct = useMemo(() => {
    if (!expenses.length) return 0;
    const now  = new Date();
    const c7   = new Date(now - 7 * 86400000);
    const c14  = new Date(now - 14 * 86400000);
    const last7 = expenses.filter(e => new Date(e.date) >= c7).reduce((s, e) => s + e.amount, 0);
    const prev7 = expenses.filter(e => new Date(e.date) >= c14 && new Date(e.date) < c7).reduce((s, e) => s + e.amount, 0);
    return prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;
  }, [expenses]);

  const alertBudgets = budgets.filter(b => b.percentageUsed >= 75);

  return (
    <div className="ef-page">
      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">Financial Overview</h4>
          <p className="text-muted small mb-0">
            Track your spending and manage your budget
            {isUSD && <span className="ms-2 badge bg-info bg-opacity-10 text-info">Showing in USD</span>}
          </p>
        </div>
        <select className="form-select form-select-sm ef-days-select"
          value={days} onChange={e => setDays(+e.target.value)}>
          <option value={7}>Last 7 days</option>
          <option value={15}>Last 15 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Budget alerts */}
      {alertBudgets.length > 0 && <BudgetAlerts budgets={alertBudgets} />}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <KPICard
            icon="bi-currency-rupee" color="primary" label="Total Spent"
            value={format(summary?.totalSpending || 0)}
            sub={`${days}-day period`} trend={trendPct} loading={expLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <KPICard
            icon="bi-graph-up" color="success" label="Daily Average"
            value={format(summary?.avgDaily || 0)}
            sub={`Max ${format(summary?.maxTransaction || 0)}`} loading={expLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <KPICard
            icon="bi-receipt" color="warning" label="Transactions"
            value={summary?.numTransactions || 0}
            sub={`Avg ${format(summary?.avgTransaction || 0)} each`} loading={expLoading}
          />
        </div>
        <div className="col-6 col-md-3">
          <KPICard
            icon="bi-bullseye" color={budgetPct > 100 ? 'danger' : 'info'} label="Budget Used"
            value={totalBudgeted > 0 ? `${budgetPct.toFixed(0)}%` : '—'}
            sub={
              totalBudgeted > 0
                ? budgetRemaining >= 0
                  ? `${format(budgetRemaining)} left`
                  : `${format(Math.abs(budgetRemaining))} over`
                : 'No budgets set'
            }
            loading={budLoading}
            progress={totalBudgeted > 0 ? Math.min(budgetPct, 100) : null}
          />
        </div>

        {/* ── Savings KPI (only shown when salary is set) ── */}
        {hasSalary && savingsInfo && (
          <div className="col-6 col-md-3">
            <KPICard
              icon="bi-piggy-bank"
              color={savingsInfo.color}
              label="Monthly Savings"
              value={savingsInfo.formattedSaved}
              sub={savingsInfo.label}
              loading={expLoading}
              progress={Math.min(savingsInfo.spentPct, 100)}
            />
          </div>
        )}
      </div>

      {/* Charts */}
      {!expLoading && expenses.length === 0 ? (
        <div className="ef-empty-state card">
          <i className="bi bi-bar-chart-line ef-empty-icon" />
          <h5>No expenses yet</h5>
          <p className="text-muted">Add your first expense to see insights</p>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <div className="card ef-card h-100">
              <div className="card-body">
                <h6 className="ef-card-title"><i className="bi bi-pie-chart-fill me-2" />By Category</h6>
                <DonutChart
                  data={summary?.categoryBreakdown || []}
                  total={summary?.totalSpending || 0}
                  loading={expLoading}
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="card ef-card h-100">
              <div className="card-body">
                <h6 className="ef-card-title"><i className="bi bi-bar-chart-fill me-2" />Daily Trend</h6>
                <DailyBarChart data={(summary?.dailyBreakdown || []).slice(-14)} loading={expLoading} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {summary && summary.categoryBreakdown?.length > 0 && (
        <div className="row g-3">
          {[
            {
              icon: '📈', label: 'Top Category',
              val: `${summary.categoryBreakdown[0].icon} ${summary.categoryBreakdown[0].category}`
            },
            {
              icon: '💰', label: 'Avg Transaction',
              val: format(summary.avgTransaction || 0)
            },
            {
              icon: '🎯', label: 'Budget Health',
              val: !totalBudgeted ? '—' : budgetPct <= 75 ? '✅ Good' : budgetPct <= 90 ? '⚠️ Fair' : '🔴 Critical'
            },
            {
              icon: '📅', label: 'Active Days',
              val: new Set(expenses.map(e => e.date?.slice(0, 10))).size
            },
            // ── Salary stat (only if set) ──
            ...(hasSalary && savingsInfo ? [{
              icon: savingsInfo.isOver ? '🔴' : '🏦',
              label: 'Salary Used',
              val: `${savingsInfo.spentPct}% spent`
            }] : []),
          ].map(({ icon, label, val }) => (
            <div className="col-6 col-md-3" key={label}>
              <div className="card ef-card ef-stat-card text-center py-3">
                <div className="fs-2 mb-1">{icon}</div>
                <div className="small text-muted">{label}</div>
                <div className="fw-bold small">{val}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}