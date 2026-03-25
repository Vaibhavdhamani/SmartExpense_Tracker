import { useState } from 'react';

export default function BudgetAlerts({ budgets = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  const visible = budgets.filter(b => !dismissed.includes(b.budgetId));
  if (!visible.length) return null;

  const getType = (pct) => pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'info';
  const getIcon = (pct) => pct >= 100 ? 'bi-exclamation-octagon-fill' : pct >= 90 ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

  return (
    <div className="card ef-alerts-card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-bell-fill text-warning" />
          <strong>Budget Alerts</strong>
          <span className="badge bg-warning text-dark">{visible.length}</span>
        </div>
        <button className="btn btn-sm btn-link text-muted" onClick={() => setCollapsed(!collapsed)}>
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="card-body pt-2 pb-2">
          {visible.map(b => {
            const type = getType(b.percentageUsed);
            return (
              <div key={b.budgetId} className={`alert alert-${type} d-flex align-items-start gap-3 py-2 px-3 mb-2`}>
                <i className={`bi ${getIcon(b.percentageUsed)} mt-1`} />
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between">
                    <strong>{b.categoryIcon} {b.categoryName}</strong>
                    <small>{b.percentageUsed.toFixed(0)}% used</small>
                  </div>
                  <div className="progress mt-1" style={{ height: 5 }}>
                    <div className={`progress-bar bg-${type}`} style={{ width: `${Math.min(b.percentageUsed, 100)}%` }} />
                  </div>
                  <small className="text-muted">
                    ₹{b.spent.toFixed(0)} spent of ₹{b.budgeted.toFixed(0)} • {b.remaining < 0 ? `₹${Math.abs(b.remaining).toFixed(0)} over budget` : `₹${b.remaining.toFixed(0)} remaining`}
                  </small>
                </div>
                <button className="btn-close btn-sm" onClick={() => setDismissed(p => [...p, b.budgetId])} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
