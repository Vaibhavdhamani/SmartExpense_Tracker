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
    setMlLoading(true); setMlError(''); setPrediction(null); setProgress(0);
    const iv = setInterval(() => setProgress(p => Math.min(p + 8, 88)), 150);
    try {
      const payload = expenses.map(e => ({
        amount:   e.amount,
        date:     e.date,
        category: e.category?.name || 'Others'
      }));
      const { data } = await axios.post(`${ML_URL}/predict`, { expenses: payload }, { timeout: 15000 });
      clearInterval(iv); setProgress(100);
      if (data.success) setPrediction(data.data);
      else setMlError(data.error || 'Prediction failed');
    } catch (err) {
      clearInterval(iv); setProgress(0);
      setMlError(err.response?.data?.error || 'ML service unreachable. Make sure python ml_service/app.py is running on port 5001.');
    } finally {
      setTimeout(() => { setMlLoading(false); setProgress(0); }, 400);
    }
  };

  const MIN_EXPENSES = 3;
  const enoughData   = expenses.length >= MIN_EXPENSES;

  // Savings forecast based on predicted spending vs salary
  const forecastSavings = prediction && hasSalary
    ? getSavingsInfo(prediction.predictedAmount)
    : null;

  if (expLoading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  return (
    <div className="ef-page">
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">AI Budget Predictions</h4>
          <p className="text-muted small mb-0">
            Machine learning powered spending forecasts
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

      {!enoughData && (
        <div className="card ef-card text-center py-5">
          <div className="ef-empty-icon fs-1 mb-3">🤖</div>
          <h5>Not Enough Data</h5>
          <p className="text-muted">Add at least {MIN_EXPENSES} expenses to unlock predictions</p>
          <div className="progress mx-auto mb-2" style={{ maxWidth: 220, height: 10 }}>
            <div className="progress-bar bg-primary" style={{ width: `${(expenses.length / MIN_EXPENSES) * 100}%` }} />
          </div>
          <small className="text-muted">{expenses.length} / {MIN_EXPENSES} expenses</small>
        </div>
      )}

      {mlError && (
        <div className="alert alert-danger d-flex align-items-start gap-3">
          <i className="bi bi-exclamation-octagon-fill fs-4 mt-1" />
          <div>
            <strong>Prediction Error</strong>
            <p className="mb-1">{mlError}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={runPrediction}>Retry</button>
          </div>
        </div>
      )}

      {mlLoading && (
        <div className="card ef-card mb-4">
          <div className="card-body text-center py-4">
            <div className="fs-1 mb-3">🧠</div>
            <h6>Training ML model on your {expenses.length} transactions…</h6>
            <div className="progress mx-auto mt-3" style={{ maxWidth: 320, height: 8 }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                style={{ width: `${progress}%` }} />
            </div>
            <small className="text-muted d-block mt-2">{progress}% complete</small>
          </div>
        </div>
      )}

      {prediction && !mlLoading && (
        <div className="row g-4">
          {/* Hero prediction card */}
          <div className="col-12">
            <div className="card ef-card ef-prediction-hero">
              <div className="card-body text-center py-4">
                <div className="ef-prediction-icon mb-3">🤖</div>
                <div className="text-muted small mb-1">Predicted Monthly Spending</div>
                <div className="ef-prediction-value">{format(prediction.predictedAmount)}</div>
                {isUSD && (
                  <div className="mt-1" style={{ opacity: .75, fontSize: 14 }}>
                    ≈ ₹{prediction.predictedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                  </div>
                )}
                <div className="d-flex justify-content-center flex-wrap gap-2 mt-3">
                  <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                    <i className="bi bi-lightning-charge me-1" />
                    {(prediction.confidenceScore * 100).toFixed(0)}% confidence
                  </span>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2">
                    <i className="bi bi-calendar3 me-1" />Next 30 days
                  </span>
                  <span className="badge bg-info bg-opacity-10 text-info px-3 py-2">
                    <i className="bi bi-database me-1" />{prediction.dataPoints} data points
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Predicted Savings card (only if salary set) ── */}
          {hasSalary && forecastSavings && (
            <div className="col-12">
              <div className={`card ef-card border-${forecastSavings.color} border-opacity-25`}>
                <div className="card-body">
                  <h6 className="ef-card-title mb-3">
                    <i className="bi bi-piggy-bank me-2" />Predicted Monthly Savings
                  </h6>
                  <div className="row g-3 align-items-center">
                    <div className="col-md-4 text-center">
                      <div className={`display-6 fw-bold text-${forecastSavings.color}`}>
                        {forecastSavings.formattedSaved}
                      </div>
                      <div className="text-muted small mt-1">{forecastSavings.label}</div>
                    </div>
                    <div className="col-md-8">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Salary</span>
                        <strong>{forecastSavings.formattedSalary}</strong>
                      </div>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Predicted spend</span>
                        <span className="text-danger">{forecastSavings.formattedSpent}</span>
                      </div>
                      <div className="progress mt-2" style={{ height: 8 }}>
                        <div
                          className={`progress-bar bg-${forecastSavings.color}`}
                          style={{ width: `${Math.min(forecastSavings.spentPct, 100)}%` }}
                        />
                      </div>
                      <div className="d-flex justify-content-between small mt-1 text-muted">
                        <span>0%</span>
                        <span>{forecastSavings.spentPct}% of salary predicted to be spent</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insight cards */}
          {prediction.insights && (
            <div className="col-12">
              <div className="row g-3">
                {[
                  {
                    icon: 'bi-currency-rupee', color: 'primary',
                    label: 'Total Spent (90d)',
                    val: format(prediction.insights.totalSpending),
                  },
                  {
                    icon: 'bi-graph-up', color: 'success',
                    label: 'Daily Average',
                    val: format(prediction.insights.avgDaily),
                  },
                  {
                    icon: 'bi-receipt', color: 'warning',
                    label: 'Transactions',
                    val: prediction.insights.numTransactions,
                  },
                  {
                    icon: 'bi-arrow-up-right',
                    color: prediction.insights.trendPercent > 0 ? 'danger' : 'success',
                    label: 'Weekly Trend',
                    val: `${prediction.insights.trendPercent > 0 ? '+' : ''}${prediction.insights.trendPercent?.toFixed(1)}%`,
                  },
                ].map(({ icon, color, label, val }) => (
                  <div className="col-6 col-md-3" key={label}>
                    <div className="card ef-card text-center">
                      <div className="card-body">
                        <div className={`ef-kpi-icon bg-${color} bg-opacity-10 text-${color} mx-auto mb-2`}>
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

          {/* Category predictions */}
          {prediction.categoryPredictions && Object.keys(prediction.categoryPredictions).length > 0 && (
            <div className="col-md-7">
              <div className="card ef-card h-100">
                <div className="card-body">
                  <h6 className="ef-card-title"><i className="bi bi-bar-chart-fill me-2" />Predicted by Category</h6>
                  {Object.entries(prediction.categoryPredictions)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([cat, amt]) => {
                      const pct = (amt / prediction.predictedAmount) * 100;
                      return (
                        <div key={cat} className="mb-2">
                          <div className="d-flex justify-content-between small mb-1">
                            <span>{cat}</span>
                            <span className="fw-medium">
                              {format(amt)}
                              <span className="text-muted ms-1">({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className={prediction.categoryPredictions ? 'col-md-5' : 'col-12'}>
            <div className="card ef-card h-100 ef-how-it-works">
              <div className="card-body">
                <h6 className="ef-card-title"><i className="bi bi-info-circle me-2" />How It Works</h6>
                {[
                  ['📊', 'Data Collection',  `Analyzes your last ${prediction.dataPoints} spending data points`],
                  ['📈', 'Trend Analysis',   'Linear regression identifies spending trajectory'],
                  ['⚖️', 'Weighted Average', 'Recent transactions weigh more than older ones'],
                  ['🎯', 'Confidence Score', 'Based on consistency of your spending patterns'],
                ].map(([icon, title, desc]) => (
                  <div className="d-flex gap-3 mb-3" key={title}>
                    <span className="fs-4">{icon}</span>
                    <div>
                      <strong className="d-block small">{title}</strong>
                      <small className="text-muted">{desc}</small>
                    </div>
                  </div>
                ))}
                {isUSD && (
                  <div className="mt-3 p-2 rounded" style={{ background: 'rgba(255,255,255,.1)', fontSize: 12 }}>
                    <i className="bi bi-info-circle me-1" />
                    Predictions calculated in INR, displayed in USD at ₹90 = $1
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {enoughData && !prediction && !mlLoading && !mlError && (
        <div className="card ef-card text-center py-5">
          <div className="fs-1 mb-3">✨</div>
          <h5>Ready to Predict Your Spending</h5>
          <p className="text-muted">
            You have {expenses.length} expense records. Let AI analyze your patterns.
            {hasSalary && <span className="d-block text-success small mt-1"><i className="bi bi-check-circle me-1" />Salary set — savings forecast included!</span>}
          </p>
          <button className="btn ef-btn-primary" onClick={runPrediction}>
            <i className="bi bi-stars me-2" />Generate Prediction
          </button>
        </div>
      )}
    </div>
  );
}