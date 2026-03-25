export default function KPICard({ icon, color, label, value, sub, trend, progress, loading }) {
  return (
    <div className={`card ef-kpi-card ef-kpi-card--${color} h-100`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className={`ef-kpi-icon bg-${color} bg-opacity-10 text-${color}`}>
            <i className={`bi ${icon} fs-5`} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span className={`badge ${trend > 0 ? 'bg-danger' : 'bg-success'} bg-opacity-10 ${trend > 0 ? 'text-danger' : 'text-success'}`}>
              <i className={`bi ${trend > 0 ? 'bi-arrow-up' : 'bi-arrow-down'} me-1`} />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        {loading
          ? <div className="placeholder-glow"><span className="placeholder col-8 rounded" /><span className="placeholder col-5 rounded mt-1" /></div>
          : <>
            <div className="ef-kpi-label text-muted small">{label}</div>
            <div className="ef-kpi-value fw-bold">{value}</div>
            {sub && <div className="ef-kpi-sub small text-muted">{sub}</div>}
            {progress !== null && progress !== undefined && (
              <div className="progress mt-2" style={{ height: '4px' }}>
                <div className={`progress-bar bg-${color}`} style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        }
      </div>
    </div>
  );
}
