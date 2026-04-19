import { useState } from 'react';
import { useCurrency } from '../hooks/useCurrency';
import { useSalary }   from '../hooks/useSalary';

const getToken = () => localStorage.getItem('ef_token');

async function fetchSuggestions(days) {
  const res  = await fetch('/api/ai/suggestions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${getToken()}` },
    body: JSON.stringify({ days }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.data;
}

const PRIORITY_CONFIG = {
  high:   { color:'#ef4444', bg:'rgba(239,68,68,0.10)',  label:'High Priority',   icon:'bi-exclamation-circle-fill' },
  medium: { color:'#f59e0b', bg:'rgba(245,158,11,0.10)', label:'Medium Priority', icon:'bi-exclamation-triangle-fill' },
  low:    { color:'#22c55e', bg:'rgba(34,197,94,0.10)',  label:'Low Priority',    icon:'bi-info-circle-fill' },
};

export default function AIInsightsPage() {
  const { format } = useCurrency();
  const { hasSalary } = useSalary();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [days,    setDays]    = useState(90);
  const [tab,     setTab]     = useState('suggestions'); // suggestions | budgets
  const [dismissed, setDismissed] = useState([]);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setData(null);
    setDismissed([]);
    try {
      const result = await fetchSuggestions(days);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const visibleSuggestions = data?.suggestions?.filter((_, i) => !dismissed.includes(i)) || [];

  return (
    <div className="ef-page">

      {/* Header */}
      <div className="ef-page-header">
        <div>
          <h4 className="ef-page-heading">AI Financial Insights</h4>
          <p className="text-muted small mb-0">
            Spending analysis · Saving suggestions · Budget recommendations
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="form-select form-select-sm ef-days-select"
            value={days} onChange={e => setDays(+e.target.value)}>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="btn ef-btn-primary" onClick={runAnalysis} disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Analyzing…</>
              : <><i className="bi bi-stars me-2" />Analyze Now</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-3">
          <i className="bi bi-exclamation-octagon-fill fs-4 mt-1" />
          <div>
            <strong>Analysis Failed</strong>
            <p className="mb-1 mt-1" style={{ fontSize:14 }}>{error}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={runAnalysis}>
              <i className="bi bi-arrow-clockwise me-1" />Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 20px',
          background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🧠</div>
          <h5 style={{ fontWeight:700 }}>AI Analysis in progress…</h5>
          <p className="text-muted">Analyzing spending patterns, detecting outliers, checking budget health</p>
          <div className="progress mx-auto mt-3" style={{ maxWidth:280, height:6 }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" style={{ width:'100%' }} />
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Insights summary bar */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:24,
            padding:'16px 20px', borderRadius:14, background:'var(--bs-body-bg)',
            border:'0.5px solid var(--bs-border-color)' }}>
            {[
              { label:'Transactions Analyzed', val: data.insights.totalAnalyzed,        icon:'bi-receipt', color:'#6366f1' },
              { label:'Avg Monthly Spend',     val: format(data.insights.avgMonthlySpend), icon:'bi-graph-up', color:'#f59e0b' },
              { label:'Savings Rate',
                val: data.insights.savingsRate !== null ? `${data.insights.savingsRate}%` : 'No salary set',
                icon:'bi-piggy-bank',
                color: data.insights.savingsRate < 20 ? '#ef4444' : '#22c55e' },
              { label:'Potential Savings/mo',  val: format(data.insights.totalPotentialSaving), icon:'bi-stars', color:'#22c55e' },
            ].map(({ label, val, icon, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10, flex:'1 1 180px' }}>
                <div style={{ width:36,height:36,borderRadius:10,background:color+'15',
                  color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0 }}>
                  <i className={`bi ${icon}`} />
                </div>
                <div>
                  <div style={{ fontSize:11,color:'var(--bs-secondary-color)' }}>{label}</div>
                  <div style={{ fontSize:16,fontWeight:800,color }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:20,
            borderBottom:'0.5px solid var(--bs-border-color)', paddingBottom:12 }}>
            {[
              { val:'suggestions', label:`Saving Tips (${visibleSuggestions.length + dismissed.length})` },
              { val:'budgets',     label:`Budget Recommendations (${data.budgetRecommendations?.length||0})` },
            ].map(t => (
              <button key={t.val} type="button" onClick={() => setTab(t.val)} style={{
                padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:600,
                border: tab===t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
                background: tab===t.val ? 'var(--bs-primary)' : 'transparent',
                color: tab===t.val ? '#fff' : 'var(--bs-secondary-color)',
                cursor:'pointer', transition:'all .15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── Saving Suggestions ── */}
          {tab === 'suggestions' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {visibleSuggestions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px',
                  background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16 }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
                  <h5 style={{ fontWeight:700 }}>Your spending looks great!</h5>
                  <p className="text-muted">No major issues found. Keep it up!</p>
                </div>
              ) : (
                visibleSuggestions.map((sg, i) => {
                  const cfg = PRIORITY_CONFIG[sg.priority] || PRIORITY_CONFIG.low;
                  return (
                    <div key={i} style={{
                      background:'var(--bs-body-bg)',
                      border:`1.5px solid ${cfg.color}30`,
                      borderLeft:`4px solid ${cfg.color}`,
                      borderRadius:14, padding:'18px 20px',
                      display:'flex', gap:16, alignItems:'flex-start',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width:48, height:48, borderRadius:14, fontSize:24, flexShrink:0,
                        background: cfg.bg, display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{sg.icon}</div>

                      {/* Content */}
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                          <div style={{ fontWeight:700, fontSize:15 }}>{sg.title}</div>
                          <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                            background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                          {sg.saving > 0 && (
                            <span style={{ fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,
                              background:'rgba(34,197,94,0.1)',color:'#16a34a',marginLeft:'auto' }}>
                              Save ₹{sg.saving.toLocaleString('en-IN')}/month
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize:13,color:'var(--bs-secondary-color)',margin:'0 0 8px' }}>
                          {sg.detail}
                        </p>
                        <div style={{ display:'flex', alignItems:'center',
                          padding:'8px 12px', borderRadius:8, gap:8,
                          background: cfg.bg, fontSize:13 }}>
                          <i className={`bi ${cfg.icon}`} style={{ color:cfg.color, flexShrink:0 }} />
                          <span style={{ fontWeight:600, color:'var(--bs-body-color)' }}>{sg.action}</span>
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button onClick={() => setDismissed(p => [...p, i])}
                        style={{ background:'none',border:'none',cursor:'pointer',
                          color:'var(--bs-secondary-color)',fontSize:18,lineHeight:1,flexShrink:0 }}>×</button>
                    </div>
                  );
                })
              )}
              {dismissed.length > 0 && (
                <button onClick={() => setDismissed([])}
                  style={{ alignSelf:'center', fontSize:12, color:'var(--bs-secondary-color)',
                    background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  {dismissed.length} dismissed suggestion{dismissed.length>1?'s':''} show again
                </button>
              )}
            </div>
          )}

          {/* ── Budget Recommendations ── */}
          {tab === 'budgets' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {!hasSalary && (
                <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:8,
                  background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
                  fontSize:13 }}>
                  <i className="bi bi-info-circle me-2 text-warning" />
                  Set your salary in Settings — recommendations will be more accurate
                </div>
              )}
              {data.budgetRecommendations?.map((rec, i) => {
                const isOver = rec.isOverBudget;
                return (
                  <div key={i} style={{
                    background:'var(--bs-body-bg)',
                    border: isOver ? '1.5px solid rgba(239,68,68,0.25)' : '0.5px solid var(--bs-border-color)',
                    borderRadius:14, padding:'16px 20px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                      <span style={{ fontSize:22 }}>{rec.categoryIcon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:700, fontSize:14 }}>{rec.categoryName}</span>
                          {isOver && (
                            <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                              background:'rgba(239,68,68,0.1)',color:'#dc2626' }}>Over Budget</span>
                          )}
                          {rec.alreadyBudgeted && (
                            <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                              background:'rgba(34,197,94,0.1)',color:'#16a34a' }}>✓ Budgeted</span>
                          )}
                          {isOver && rec.savingPotential > 0 && (
                            <span style={{ fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,
                              background:'rgba(34,197,94,0.1)',color:'#16a34a',marginLeft:'auto' }}>
                              Save ₹{rec.savingPotential.toLocaleString('en-IN')}/mo
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:12,color:'var(--bs-secondary-color)',marginTop:2 }}>
                          {rec.reasoning}
                        </div>
                      </div>
                    </div>

                    {/* Visual comparison bar */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span className="text-muted">Current: ₹{rec.currentSpend?.toLocaleString('en-IN')}/month</span>
                        <span style={{ fontWeight:600, color: isOver?'#ef4444':'#22c55e' }}>
                          Recommended: ₹{rec.recommendedBudget?.toLocaleString('en-IN')}/month
                        </span>
                      </div>
                      <div style={{ height:8, borderRadius:10, background:'var(--bs-border-color)', overflow:'hidden', position:'relative' }}>
                        {/* Recommended (base) */}
                        <div style={{
                          position:'absolute', height:'100%', borderRadius:10,
                          background:'rgba(34,197,94,0.3)',
                          width:`${Math.min((rec.recommendedBudget/(Math.max(rec.currentSpend,rec.recommendedBudget)||1))*100,100)}%`,
                        }} />
                        {/* Current */}
                        <div style={{
                          position:'absolute', height:'100%', borderRadius:10,
                          background: isOver ? '#ef4444' : '#22c55e',
                          width:`${Math.min((rec.currentSpend/(Math.max(rec.currentSpend,rec.recommendedBudget)||1))*100,100)}%`,
                          opacity:0.8,
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Ready state */}
      {!data && !loading && !error && (
        <div style={{ textAlign:'center', padding:'60px 20px',
          background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>✨</div>
          <h5 style={{ fontWeight:700, marginBottom:8 }}>AI Analysis Ready</h5>
          <p className="text-muted" style={{ maxWidth:380, margin:'0 auto 16px' }}>
            Analyze your spending patterns — get personalized saving tips and
            budget recommendations
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            {['Overspend Detection','Budget 50/30/20 Rule','Impulse Buy Alert','Savings Rate Check'].map(f => (
              <span key={f} style={{ fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:20,
                background:'rgba(99,102,241,0.1)',color:'#6366f1' }}>{f}</span>
            ))}
          </div>
          <button className="btn ef-btn-primary" style={{ borderRadius:10,padding:'10px 28px' }}
            onClick={runAnalysis}>
            <i className="bi bi-stars me-2" />Start AI Analysis
          </button>
        </div>
      )}
    </div>
  );
}