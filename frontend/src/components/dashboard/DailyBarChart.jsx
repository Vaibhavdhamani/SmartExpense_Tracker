import { useState } from 'react';

export default function DailyBarChart({ data = [], loading }) {
  const [tooltip, setTooltip] = useState(null);
  if (loading) return <div className="ef-chart-placeholder"><div className="ef-spinner" /></div>;
  if (!data.length) return <div className="ef-chart-empty"><i className="bi bi-bar-chart fs-1 text-muted" /><p className="text-muted mt-2">No data</p></div>;

  const max = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="ef-bar-chart">
      {data.map((d, i) => {
        const h = (d.total / max) * 100;
        const date = new Date(d.date);
        return (
          <div key={i} className="ef-bar-col"
            onMouseEnter={() => setTooltip(i)} onMouseLeave={() => setTooltip(null)}>
            {tooltip === i && (
              <div className="ef-bar-tooltip">
                <strong>₹{d.total.toFixed(0)}</strong>
                <small>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>
              </div>
            )}
            <div className="ef-bar-track">
              <div className="ef-bar-fill" style={{ height: `${h}%` }} />
            </div>
            <span className="ef-bar-label">{date.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}
