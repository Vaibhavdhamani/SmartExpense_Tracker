import { useState } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useCurrency } from '../hooks/useCurrency';
import { useSalary }   from '../hooks/useSalary';
import axios from 'axios';

const ML_URL = process.env.REACT_APP_ML_URL || 'http://localhost:5001';

export default function PredictionsPage() {
  const { expenses, loading: expLoading } = useExpenses(90);
  const { format, isUSD }                 = useCurrency();
  const { hasSalary, getSavingsInfo }     = useSalary();

  const [prediction, setPrediction] = useState(null);
  const [mlLoading,  setMlLoading]  = useState(false);
  const [mlError,    setMlError]    = useState('');
  const [progress,   setProgress]   = useState(0);

  const runPrediction = async () => {
    if (expenses.length < 3) return;
    setMlLoading(true);
    setMlError('');
    setPrediction(null);
    setProgress(0);

    const iv = setInterval(() => setProgress(p => Math.min(p + 6, 88)), 120);

    try {
      const payload = expenses.map(e => ({
        amount:   e.amount,
        date:     e.date,
        category: e.category?.name || 'Others',
      }));

      const { data } = await axios.post(
        `${ML_URL}/predict`,
        { expenses: payload },
        { timeout: 20000 }
      );

      clearInterval(iv);
      setProgress(100);

      if (data.success) setPrediction(data.data);
      else              setMlError(data.error || 'Prediction failed');
    } catch (err) {
      clearInterval(iv);
      setProgress(0);
      setMlError(
        err.response?.data?.error ||
        'ML service unreachable. Make sure: python ml_service/app.py is running on port 5001.'
      );
    } finally {
      setTimeout(() => { setMlLoading(false); setProgress(0); }, 400);
    }
  };

  const MIN_EXPENSES  = 3;
  const enoughData    = expenses.length >= MIN_EXPENSES;
  const forecastSavings = prediction && hasSalary
    ? getSavingsInfo(prediction.predictedAmount)
    : null;

  const hasOutliers = prediction?.insights?.outliersDetected > 0;

  if (expLoading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="ef-page">

      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">AI Budget Predictions</h4>
          <p className="text-muted small mb-0">
            Robust ML — outlier-resistant spending forecast
            {isUSD && <span className="ms-2 badge bg-info bg-opacity-10 text-info">Showing in USD</span>}
          </p>
        </div>
        {enoughData && (
          <button className="btn ef-btn-primary" onClick={runPrediction} disabled={mlLoading}>
            {mlLoading
              ? <><span className="spinner-border spinner-border-sm me-2" />Analyzing…</>
              : <><i className="bi bi-stars me-2" />Run Prediction</>}
          </button>
        )}
      </div>

      {/* Not enough data */}
      {!enoughData && (
        <div className="card ef-card text-center py-5">
          <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
          <h5>Not Enough Data</h5>
          <p className="text-muted">Add at least {MIN_EXPENSES} expenses to unlock predictions</p>
          <div className="progress mx-auto mb-2" style={{ maxWidth: 220, height: 10 }}>
            <div className="progress-bar bg-primary"
              style={{ width: `${(expenses.length / MIN_EXPENSES) * 100}%` }} />
          </div>
          <small className="text-muted">{expenses.length} / {MIN_EXPENSES} expenses</small>
        </div>
      )}

      {/* Error */}
      {mlError && (
        <div className="alert alert-danger d-flex align-items-start gap-3">
          <i className="bi bi-exclamation-octagon-fill fs-4 mt-1" />
          <div>
            <strong>Prediction Error</strong>
            <p className="mb-1 mt-1" style={{ fontSize: 14 }}>{mlError}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={runPrediction}>
              <i className="bi bi-arrow-clockwise me-1" />Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {mlLoading && (
        <div className="card ef-card mb-4">
          <div className="card-body text-center py-4">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
            <h6>Analyzing {expenses.length} transactions with robust algorithm…</h6>
            <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginBottom: 12 }}>
              Outlier detection · Monthly normalization · Trend dampening
            </div>
            <div className="progress mx-auto" style={{ maxWidth: 320, height: 8 }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <small className="text-muted d-block mt-2">{progress}% complete</small>
          </div>
        </div>
      )}

      {/* Results */}
      {prediction && !mlLoading && (
        <div className="row g-4">

          {/* Hero card */}
          <div className="col-12">
            <div style={{
              background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)',
              borderRadius: 20, padding: '28px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
              <div className="text-muted small mb-1">Predicted Monthly Spending (Next 30 Days)</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--bs-body-color)', marginBottom: 4 }}>
                {format(prediction.predictedAmount)}
              </div>
              {isUSD && (
                <div style={{ fontSize: 14, color: 'var(--bs-secondary-color)', marginBottom: 8 }}>
                  ≈ ₹{prediction.predictedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                </div>
              )}

              {/* Outlier warning */}
              {hasOutliers && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  fontSize: 13,
                }}>
                  <i className="bi bi-shield-check text-warning" />
                  <span>
                    <strong>{prediction.insights.outliersDetected}</strong> unusual month
                    {prediction.insights.outliersDetected > 1 ? 's' : ''} detected —
                    algorithm ne inhe automatically adjust kiya
                  </span>
                </div>
              )}

              <div className="d-flex justify-content-center flex-wrap gap-2 mt-2">
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                }}>
                  <i className="bi bi-lightning-charge me-1" />
                  {(prediction.confidenceScore * 100).toFixed(0)}% confidence
                </span>
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(100,116,139,0.1)', color: '#64748b',
                }}>
                  <i className="bi bi-calendar3 me-1" />
                  {prediction.monthsAnalyzed} months analyzed
                </span>
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(34,197,94,0.1)', color: '#16a34a',
                }}>
                  <i className="bi bi-database me-1" />
                  {prediction.dataPoints} transactions
                </span>
                <span style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(20,184,166,0.1)', color: '#0f766e',
                }}>
                  <i className="bi bi-shield-check me-1" />
                  Outlier-resistant
                </span>
              </div>
            </div>
          </div>

          {/* Monthly history comparison */}
          {prediction.insights?.medianMonthly && (
            <div className="col-12">
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 16, padding: '20px',
              }}>
                <h6 style={{ fontWeight: 700, marginBottom: 16 }}>
                  <i className="bi bi-bar-chart-fill me-2 text-primary" />
                  Spending Analysis
                </h6>
                <div className="row g-3">
                  {[
                    {
                      label: 'Predicted Next Month',
                      val: format(prediction.predictedAmount),
                      color: '#6366f1',
                      icon: 'bi-graph-up-arrow',
                      note: 'Outlier-adjusted forecast',
                    },
                    {
                      label: 'Median Monthly (Actual)',
                      val: format(prediction.insights.medianMonthly),
                      color: '#22c55e',
                      icon: 'bi-activity',
                      note: 'Your typical month',
                    },
                    {
                      label: 'Daily Average',
                      val: format(prediction.dailyAverage),
                      color: '#f59e0b',
                      icon: 'bi-calendar-day',
                      note: 'Per day forecast',
                    },
                    {
                      label: 'Trend',
                      val: `${prediction.insights.trendPercent > 0 ? '+' : ''}${prediction.insights.trendPercent}%`,
                      color: prediction.insights.trendPercent > 10 ? '#ef4444' : prediction.insights.trendPercent < -5 ? '#22c55e' : '#64748b',
                      icon: prediction.insights.trendPercent > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right',
                      note: '30d vs prev 30d',
                    },
                  ].map(({ label, val, color, icon, note }) => (
                    <div className="col-6 col-md-3" key={label}>
                      <div style={{
                        padding: '14px', borderRadius: 12, textAlign: 'center',
                        background: color + '10',
                        border: `1px solid ${color}25`,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: color + '20', color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 8px', fontSize: 17,
                        }}>
                          <i className={`bi ${icon}`} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--bs-secondary-color)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color }}>{val}</div>
                        <div style={{ fontSize: 10, color: 'var(--bs-secondary-color)', marginTop: 2 }}>{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Savings forecast */}
          {hasSalary && forecastSavings && (
            <div className="col-12">
              <div style={{
                background: 'var(--bs-body-bg)',
                border: `1.5px solid ${forecastSavings.isOver ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                borderRadius: 16, padding: '20px',
              }}>
                <h6 style={{ fontWeight: 700, marginBottom: 16 }}>
                  <i className="bi bi-piggy-bank me-2" />Predicted Savings
                </h6>
                <div className="row g-3 align-items-center">
                  <div className="col-md-4 text-center">
                    <div style={{
                      fontSize: 32, fontWeight: 800,
                      color: forecastSavings.isOver ? '#ef4444' : '#22c55e',
                    }}>
                      {forecastSavings.formattedSaved}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)' }}>
                      {forecastSavings.label}
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span className="text-muted">Monthly Salary</span>
                      <strong>{forecastSavings.formattedSalary}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span className="text-muted">Predicted Spend</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>
                        {forecastSavings.formattedSpent}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 10, background: 'var(--bs-border-color)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 10,
                        background: forecastSavings.isOver ? '#ef4444' : '#22c55e',
                        width: `${Math.min(forecastSavings.spentPct, 100)}%`,
                        transition: 'width .5s ease',
                      }} />
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 11, color: 'var(--bs-secondary-color)', marginTop: 4,
                    }}>
                      <span>0%</span>
                      <span>{forecastSavings.spentPct}% of salary predicted to be spent</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category predictions + How it works */}
          <div className="col-md-7">
            {prediction.categoryPredictions &&
             Object.keys(prediction.categoryPredictions).length > 0 && (
              <div style={{
                background: 'var(--bs-body-bg)',
                border: '0.5px solid var(--bs-border-color)',
                borderRadius: 16, padding: '20px', height: '100%',
              }}>
                <h6 style={{ fontWeight: 700, marginBottom: 16 }}>
                  <i className="bi bi-bar-chart-fill me-2 text-primary" />
                  Predicted by Category
                </h6>
                {Object.entries(prediction.categoryPredictions)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([cat, amt]) => {
                    const pct = prediction.predictedAmount > 0
                      ? (amt / prediction.predictedAmount) * 100
                      : 0;
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 13, marginBottom: 4,
                        }}>
                          <span style={{ fontWeight: 500 }}>{cat}</span>
                          <span style={{ fontWeight: 600 }}>
                            {format(amt)}
                            <span style={{ color: 'var(--bs-secondary-color)', marginLeft: 6, fontSize: 12 }}>
                              ({pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div style={{
                          height: 7, borderRadius: 10,
                          background: 'var(--bs-border-color)', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 10,
                            background: 'var(--bs-primary)',
                            width: `${pct}%`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* How it works — v2 algorithm */}
          <div className="col-md-5">
            <div style={{
              background: 'var(--bs-body-bg)',
              border: '0.5px solid var(--bs-border-color)',
              borderRadius: 16, padding: '20px', height: '100%',
            }}>
              <h6 style={{ fontWeight: 700, marginBottom: 16 }}>
                <i className="bi bi-info-circle me-2" />Algorithm v2
              </h6>
              {[
                ['🛡️', 'Outlier Detection',   'IQR-based winsorization — ek bada expense prediction spoil nahi karega'],
                ['📊', 'Monthly Buckets',      'Daily nahi, monthly totals pe kaam karta hai — sparse data handle karta hai'],
                ['⚖️', 'Weighted Median',      'Mean nahi, median use karta hai — skewed data pe zyada accurate'],
                ['📈', 'Damped Trend',         'Trend slope ±20% pe cap hai — ek expensive month prediction explode nahi karega'],
                ['🕐', 'Recency Bias',         'Recent mahine ka weight 4x zyada — purane patterns irrelevant ho jaate hain'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}

              {isUSD && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}>
                  <i className="bi bi-info-circle me-1" />
                  INR mein calculate, USD mein display (₹90 = $1)
                </div>
              )}
            </div>
          </div>

          {/* Transaction stats */}
          {prediction.insights && (
            <div className="col-12">
              <div className="row g-3">
                {[
                  {
                    icon: 'bi-receipt', color: '#6366f1',
                    label: 'Total Transactions',
                    val: prediction.insights.numTransactions,
                  },
                  {
                    icon: 'bi-graph-up', color: '#22c55e',
                    label: 'Avg Transaction',
                    val: format(prediction.insights.avgTransaction),
                  },
                  {
                    icon: 'bi-bar-chart', color: '#f59e0b',
                    label: 'Median Transaction',
                    val: format(prediction.insights.medianTransaction),
                  },
                  {
                    icon: 'bi-arrow-up-circle', color: '#ef4444',
                    label: 'Largest Transaction',
                    val: format(prediction.insights.maxTransaction),
                  },
                ].map(({ icon, color, label, val }) => (
                  <div className="col-6 col-md-3" key={label}>
                    <div className="card ef-card text-center">
                      <div className="card-body py-3">
                        <div className={`ef-kpi-icon mx-auto mb-2`}
                          style={{ background: color + '15', color }}>
                          <i className={`bi ${icon}`} />
                        </div>
                        <div className="small text-muted">{label}</div>
                        <div className="fw-bold">{val}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ready state */}
      {enoughData && !prediction && !mlLoading && !mlError && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bs-body-bg)',
          border: '0.5px solid var(--bs-border-color)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Ready to Predict</h5>
          <p className="text-muted" style={{ maxWidth: 360, margin: '0 auto 8px' }}>
            {expenses.length} transactions available. New algorithm automatically handles
            high/unusual expenses.
          </p>
          <div style={{
            display: 'inline-flex', gap: 8, marginBottom: 20,
            padding: '8px 16px', borderRadius: 10,
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 13, color: '#16a34a',
          }}>
            <i className="bi bi-shield-check" />
            Outlier-resistant · Median-based · Damped trend
          </div>
          <br />
          <button
            className="btn ef-btn-primary"
            style={{ borderRadius: 10, padding: '10px 28px' }}
            onClick={runPrediction}
          >
            <i className="bi bi-stars me-2" />Generate Prediction
          </button>
        </div>
      )}
    </div>
  );
}