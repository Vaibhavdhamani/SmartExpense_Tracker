import { useState } from 'react';

export default function DonutChart({ data = [], total = 0, loading }) {
  const [hovered, setHovered] = useState(null);

  if (loading) return <div className="ef-chart-placeholder"><div className="ef-spinner" /></div>;
  if (!data.length) return (
    <div className="ef-chart-empty">
      <i className="bi bi-pie-chart fs-1 text-muted" />
      <p className="text-muted mt-2">No data</p>
    </div>
  );

  let angle = -90;
  const slices = data.map((d) => {
    const pct = (d.total / total) * 360;
    const start = angle; angle += pct;
    return { ...d, start, end: angle - 0.3, pct: (d.total / total) * 100 };
  });

  const arcPath = (cx, cy, r, a1, a2) => {
    const r2d = a => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(r2d(a1)), y1 = cy + r * Math.sin(r2d(a1));
    const x2 = cx + r * Math.cos(r2d(a2)), y2 = cy + r * Math.sin(r2d(a2));
    return `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
  };

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <div className="d-flex flex-column flex-md-row align-items-center gap-3">
      <div style={{ position: 'relative', minWidth: 160 }}>
        <svg viewBox="0 0 200 200" width="160" height="160" className="ef-donut-svg">
          {slices.map((s, i) => (
            <path key={i} d={arcPath(100, 100, 80, s.start, s.end)}
              fill={s.color}
              opacity={hovered === null || hovered === i ? 1 : 0.4}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)} />
          ))}
          {/* Use currentColor-aware class instead of inline fill */}
          <circle cx="100" cy="100" r="54" className="ef-donut-hole" />
          <text x="100" y="95" textAnchor="middle"
            className="ef-donut-value" fontSize="18" fontWeight="700">
            {hov ? `${hov.pct.toFixed(0)}%` : `₹${Math.round(total)}`}
          </text>
          <text x="100" y="115" textAnchor="middle"
            className="ef-donut-label" fontSize="11">
            {hov ? hov.category : 'Total'}
          </text>
        </svg>
      </div>

      <div className="ef-donut-legend flex-grow-1 w-100">
        {slices.slice(0, 7).map((s, i) => (
          <div key={i}
            className={`ef-legend-row ${hovered === i ? 'ef-legend-row--active' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            <span className="ef-legend-dot" style={{ background: s.color }} />
            <span className="ef-legend-label text-truncate flex-grow-1">{s.icon} {s.category}</span>
            <span className="ef-legend-val">₹{s.total.toFixed(0)}</span>
            <span className="ef-legend-pct text-muted">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}