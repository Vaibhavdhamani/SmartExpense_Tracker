import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency } from '../hooks/useCurrency';

const getToken = () => localStorage.getItem('ef_token');
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PALETTE  = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b'];

// ─── Animated number ──────────────────────────────────────────
function AnimNum({ value, format }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current, end = value, dur = 700;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prev.current = end;
  }, [value]);
  return <span>{format(display)}</span>;
}

// ─── Donut Chart ───────────────────────────────────────────────
function Donut({ data, total, size = 180 }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length || !total) return null;
  const cx = size/2, cy = size/2, R = size*0.40, r = size*0.26;
  let angle = -Math.PI/2;
  const slices = data.slice(0,9).map((d,i) => {
    const a  = (d.total/total)*2*Math.PI;
    const x1 = cx+R*Math.cos(angle),     y1 = cy+R*Math.sin(angle);
    const x2 = cx+R*Math.cos(angle+a),   y2 = cy+R*Math.sin(angle+a);
    const ix1= cx+r*Math.cos(angle),    iy1= cy+r*Math.sin(angle);
    const ix2= cx+r*Math.cos(angle+a),  iy2= cy+r*Math.sin(angle+a);
    const lg = a > Math.PI ? 1 : 0;
    const path=`M${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${lg},0 ${ix1},${iy1} Z`;
    const col = d.color || PALETTE[i%PALETTE.length];
    const mid = angle + a/2;
    const s = { path, col, name:d.name, total:d.total, pct:Math.round(d.total/total*100), icon:d.icon, mid };
    angle += a;
    return s;
  });
  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
      <svg width={size} height={size} style={{ flexShrink:0, filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
        {slices.map((s,i) => {
          const scale = hovered===i ? 1.06 : 1;
          const ox = (hovered===i ? 5*Math.cos(s.mid) : 0);
          const oy = (hovered===i ? 5*Math.sin(s.mid) : 0);
          return (
            <path key={i} d={s.path}
              fill={s.col}
              stroke="var(--bs-body-bg)" strokeWidth="2.5"
              transform={`translate(${ox},${oy})`}
              style={{ cursor:'pointer', transition:'transform .18s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={r-2} fill="var(--bs-body-bg)" />
        {active ? (
          <>
            <text x={cx} y={cy-8} textAnchor="middle" fontSize="11" fill="var(--bs-secondary-color)" fontFamily="sans-serif">{active.name.slice(0,12)}</text>
            <text x={cx} y={cy+8} textAnchor="middle" fontSize="13" fontWeight="700" fill={active.col} fontFamily="sans-serif">{active.pct}%</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy-4} textAnchor="middle" fontSize="10" fill="var(--bs-secondary-color)" fontFamily="sans-serif">Total</text>
            <text x={cx} y={cy+12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--bs-body-color)" fontFamily="sans-serif">₹{(total/1000).toFixed(1)}K</text>
          </>
        )}
      </svg>
      <div style={{ flex:'1 1 120px', display:'flex', flexDirection:'column', gap:6 }}>
        {slices.map((s,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', opacity: hovered!==null&&hovered!==i ? 0.45 : 1, transition:'opacity .18s' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:s.col, flexShrink:0 }} />
            <div style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.icon} {s.name}</div>
            <div style={{ fontSize:11, fontWeight:700, color:s.col }}>{s.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart with hover tooltips ────────────────────────────
function BarChartViz({ data, height=160, color='#6366f1', showLabels=true }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return null;
  const max   = Math.max(...data.map(d => d.total), 1);
  const VW=600, VH=height, PAD=8, barW=Math.max(Math.floor((VW-PAD*2)/data.length*0.62),4);
  const bx = (i) => PAD + i*(VW-PAD*2)/data.length + ((VW-PAD*2)/data.length - barW)/2;

  return (
    <div style={{ position:'relative' }}>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ overflow:'visible' }}>
        {/* Grid lines */}
        {[0.25,0.5,0.75,1].map(p => (
          <line key={p} x1={PAD} y1={VH-20-(VH-30)*p} x2={VW-PAD} y2={VH-20-(VH-30)*p}
            stroke="var(--bs-border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
        ))}
        {/* Bars */}
        {data.map((d,i) => {
          const bh  = Math.max((d.total/max)*(VH-30),2);
          const by  = VH-20-bh;
          const x   = bx(i);
          const isH = hovered===i;
          return (
            <g key={i} style={{ cursor:'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              <rect x={x} y={by} width={barW} height={bh}
                fill={isH ? color : color+'cc'}
                rx="3"
                style={{ transition:'fill .15s, y .15s, height .15s' }}
              />
              {showLabels && data.length <= 12 && (
                <text x={x+barW/2} y={VH-6} textAnchor="middle"
                  fontSize={data.length>8?8:9} fill="var(--bs-secondary-color)" fontFamily="sans-serif">
                  {d.label || d.key?.slice(-2)}
                </text>
              )}
              {isH && (
                <g>
                  <rect x={x+barW/2-28} y={by-32} width={56} height={22} rx="5"
                    fill="var(--bs-body-color)" opacity="0.88" />
                  <text x={x+barW/2} y={by-17} textAnchor="middle"
                    fontSize="10" fontWeight="700" fill="var(--bs-body-bg)" fontFamily="sans-serif">
                    ₹{(d.total/1000).toFixed(1)}K
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* X axis */}
        <line x1={PAD} y1={VH-20} x2={VW-PAD} y2={VH-20}
          stroke="var(--bs-border-color)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

// ─── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color='#6366f1', w=80, h=32 }) {
  if (!data?.length || data.length < 2) return null;
  const max = Math.max(...data.map(d=>d.total),1);
  const pts = data.map((d,i) => {
    const x = 2+(i/(data.length-1))*(w-4);
    const y = h-4-((d.total/max)*(h-8));
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow:'visible' }}>
      <polyline points={`2,${h} ${pts} ${w-2},${h}`} fill={color} fillOpacity=".12" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────
function Ring({ pct, color, size=56 }) {
  const r  = (size-8)/2, c = 2*Math.PI*r;
  const off= c - (Math.min(pct,100)/100)*c;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bs-border-color)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition:'stroke-dashoffset .6s ease' }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="11" fontWeight="700"
        fill={color} fontFamily="sans-serif">{pct}%</text>
    </svg>
  );
}

// ─── Weekly Heatmap ────────────────────────────────────────────
function WeeklyHeatmap({ expenses }) {
  if (!expenses?.length) return null;
  const byDay = [0,0,0,0,0,0,0];
  const cntDay= [0,0,0,0,0,0,0];
  expenses.forEach(e => {
    const d = new Date(e.date).getDay();
    byDay[d]  += e.amount;
    cntDay[d] += 1;
  });
  const max = Math.max(...byDay, 1);
  return (
    <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
      {DAYS.map((day, i) => {
        const intensity = byDay[i]/max;
        return (
          <div key={i} style={{ flex:1, textAlign:'center' }}>
            <div title={`₹${byDay[i].toLocaleString('en-IN')} · ${cntDay[i]} txns`} style={{
              height: Math.max(intensity*64,4),
              borderRadius:6,
              background: `rgba(99,102,241,${0.1 + intensity*0.85})`,
              marginBottom:6, cursor:'default',
              transition:'height .4s ease',
            }}/>
            <div style={{ fontSize:10, color:'var(--bs-secondary-color)' }}>{day}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month vs Month mini chart ────────────────────────────────
function MonthCompare({ current, previous, format }) {
  if (!current && !previous) return null;
  const max = Math.max(current||0, previous||0, 1);
  const pct1 = ((current||0)/max)*100;
  const pct2 = ((previous||0)/max)*100;
  const diff  = previous > 0 ? Math.round(((current-previous)/previous)*100) : null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
          <span style={{ color:'var(--bs-secondary-color)' }}>This period</span>
          <span style={{ fontWeight:700, color:'#6366f1' }}>{format(current||0)}</span>
        </div>
        <div style={{ height:10, borderRadius:10, background:'var(--bs-border-color)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:10, background:'#6366f1', width:`${pct1}%`, transition:'width .5s' }}/>
        </div>
      </div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
          <span style={{ color:'var(--bs-secondary-color)' }}>Previous period</span>
          <span style={{ fontWeight:700, color:'#94a3b8' }}>{format(previous||0)}</span>
        </div>
        <div style={{ height:10, borderRadius:10, background:'var(--bs-border-color)', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:10, background:'#94a3b8', width:`${pct2}%`, transition:'width .5s' }}/>
        </div>
      </div>
      {diff !== null && (
        <div style={{ textAlign:'center', padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700,
          background: diff>0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
          color: diff>0 ? '#dc2626' : '#16a34a' }}>
          {diff>0 ? '▲' : '▼'} {Math.abs(diff)}% {diff>0 ? 'higher' : 'lower'} than previous
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon, color, bg, label, value, sub, subColor, animate, format }) {
  return (
    <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:bg, color,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
          <i className={`bi ${icon}`}/>
        </div>
        {sub && (
          <div style={{ fontSize:11, fontWeight:700, color:subColor || 'var(--bs-secondary-color)',
            padding:'2px 8px', borderRadius:20,
            background: subColor ? subColor+'14' : 'var(--bs-border-color)' }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginBottom:3 }}>{label}</div>
      <div style={{ fontWeight:800, fontSize:20, color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {animate ? <AnimNum value={typeof value === 'number' ? value : 0} format={format || (v=>v)} /> : value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const { format } = useCurrency();
  const now = new Date();

  const [period,      setPeriod]      = useState('monthly');
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth()+1);
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [downloading, setDownloading] = useState('');
  const [tab,         setTab]         = useState('overview');
  const [txnSearch,   setTxnSearch]   = useState('');
  const [txnSort,     setTxnSort]     = useState('date-desc');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p   = new URLSearchParams({ period, year, month });
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reports/analytics?${p}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setData(j.data);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [period, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const download = async (type) => {
    setDownloading(type);
    try {
      const p   = new URLSearchParams({ period, year, month });
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reports/${type}?${p}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const lbl  = period==='monthly' ? `${MONTHS[month-1]}_${year}` : `Year_${year}`;
      a.href = url; a.download = `ExpenseFlow_${lbl}.${type}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
    finally      { setDownloading(''); }
  };

  const s = data?.summary || {};
  const periodLabel = period==='monthly' ? `${MONTHS[month-1]} ${year}` : `Year ${year}`;
  const yearOpts    = Array.from({length:5},(_,i)=>now.getFullYear()-i);

  // Filtered + sorted transactions
  const filteredTxns = (data?.expenses||[])
    .filter(e => !txnSearch || e.description?.toLowerCase().includes(txnSearch.toLowerCase()) || e.category?.toLowerCase().includes(txnSearch.toLowerCase()))
    .sort((a,b) => {
      if (txnSort==='date-desc')   return new Date(b.date)-new Date(a.date);
      if (txnSort==='date-asc')    return new Date(a.date)-new Date(b.date);
      if (txnSort==='amount-desc') return b.amount-a.amount;
      if (txnSort==='amount-asc')  return a.amount-b.amount;
      return 0;
    });

  return (
    <div className="ef-page">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="ef-page-header" style={{ flexWrap:'wrap', gap:10 }}>
        <div>
          <h4 className="ef-page-heading">Analytics</h4>
          <p className="text-muted small mb-0">{periodLabel} · Detailed financial insights</p>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {/* Period pill */}
          <div style={{ display:'flex', borderRadius:10, overflow:'hidden', border:'1px solid var(--bs-border-color)' }}>
            {['monthly','yearly'].map(p=>(
              <button key={p} type="button" onClick={()=>setPeriod(p)} style={{
                padding:'6px 14px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                background: period===p ? 'var(--bs-primary)' : 'transparent',
                color: period===p ? '#fff' : 'var(--bs-secondary-color)',
                textTransform:'capitalize',
              }}>{p}</button>
            ))}
          </div>

          <select className="form-select form-select-sm" style={{ width:88, borderRadius:8 }}
            value={year} onChange={e=>setYear(+e.target.value)}>
            {yearOpts.map(y=><option key={y} value={y}>{y}</option>)}
          </select>

          {period==='monthly' && (
            <select className="form-select form-select-sm" style={{ width:78, borderRadius:8 }}
              value={month} onChange={e=>setMonth(+e.target.value)}>
              {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
          )}

          {/* Export */}
          <button className="btn btn-sm" disabled={!!downloading||loading||!data}
            onClick={()=>download('pdf')}
            style={{ borderRadius:8, fontWeight:600, background:'rgba(239,68,68,0.1)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.25)' }}>
            {downloading==='pdf' ? <span className="spinner-border spinner-border-sm"/> : <><i className="bi bi-file-pdf me-1"/>PDF</>}
          </button>
          <button className="btn btn-sm" disabled={!!downloading||loading||!data}
            onClick={()=>download('csv')}
            style={{ borderRadius:8, fontWeight:600, background:'rgba(34,197,94,0.1)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.25)' }}>
            {downloading==='csv' ? <span className="spinner-border spinner-border-sm"/> : <><i className="bi bi-filetype-csv me-1"/>CSV</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
          <i className="bi bi-exclamation-triangle-fill"/>
          <span style={{fontSize:13}}>{error}</span>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
          <div className="spinner-border text-primary mb-3" style={{width:32,height:32}}/>
          <p className="text-muted small">Loading analytics for {periodLabel}…</p>
        </div>
      )}

      {data && !loading && (<>

        {/* ── KPI GRID ─────────────────────────────────────── */}
        <div style={{
          display:'grid', gap:10, marginBottom:16,
          gridTemplateColumns:'repeat(2,1fr)',
        }} className="ef-kpi-grid">
          <KpiCard icon="bi-cash-stack"   color="#6366f1" bg="rgba(99,102,241,0.1)"
            label="Total Spent" value={s.total||0}
            sub={s.changesPct!=null ? `${s.changesPct>0?'▲':'▼'} ${Math.abs(s.changesPct)}%`:null}
            subColor={s.changesPct>0?'#ef4444':'#22c55e'}
            animate format={v=>`₹${v.toLocaleString('en-IN')}`}/>
          <KpiCard icon="bi-calendar-day" color="#f59e0b" bg="rgba(245,158,11,0.1)"
            label="Daily Average" value={s.avgDaily||0}
            sub={`${s.txnCount||0} txns`} subColor="#64748b"
            animate format={v=>`₹${v.toLocaleString('en-IN')}`}/>
          <KpiCard icon="bi-piggy-bank"
            color={(s.savingsAmount||0)>=0?'#22c55e':'#ef4444'}
            bg={(s.savingsAmount||0)>=0?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)'}
            label="Savings" value={s.savingsAmount!=null ? format(Math.abs(s.savingsAmount)) : '—'}
            sub={s.savingsPct!=null?`${Math.abs(s.savingsPct)}% of salary`:null}
            subColor={(s.savingsAmount||0)>=0?'#22c55e':'#ef4444'}/>
          <KpiCard icon="bi-pie-chart-fill" color="#ec4899" bg="rgba(236,72,153,0.1)"
            label="Top Category" value={s.topCategory||'—'}
            sub={s.topCategoryPct?`${s.topCategoryPct}% of total`:null}
            subColor="#6366f1"/>
        </div>

        {/* ── TABS ─────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', borderBottom:'0.5px solid var(--bs-border-color)', paddingBottom:10 }}>
          {[
            {val:'overview',     label:'Overview',     icon:'bi-grid-1x2'},
            {val:'categories',   label:'Categories',   icon:'bi-pie-chart'},
            {val:'budgets',      label:'Budgets',      icon:'bi-bullseye'},
            {val:'goals',        label:'Goals',        icon:'bi-trophy'},
            {val:'transactions', label:'Transactions', icon:'bi-receipt'},
          ].map(t=>(
            <button key={t.val} type="button" onClick={()=>setTab(t.val)} style={{
              padding:'6px 13px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              border: tab===t.val ? '2px solid var(--bs-primary)' : '1px solid var(--bs-border-color)',
              background: tab===t.val ? 'var(--bs-primary)' : 'transparent',
              color: tab===t.val ? '#fff' : 'var(--bs-secondary-color)',
              display:'flex', alignItems:'center', gap:5, transition:'all .15s',
            }}>
              <i className={`bi ${t.icon}`} style={{fontSize:11}}/>{t.label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW ══════ */}
        {tab==='overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Spending over time bar chart */}
            {data.byTime?.length > 0 && (
              <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>
                      <i className="bi bi-bar-chart-fill me-2" style={{color:'#6366f1'}}/>Spending Over Time
                    </div>
                    <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:2 }}>
                      {data.byTime.length} data points · {periodLabel}
                    </div>
                  </div>
                  <Sparkline data={data.byTime} color="#6366f1" w={80} h={32}/>
                </div>
                <BarChartViz data={data.byTime} color="#6366f1" height={160}/>
              </div>
            )}

            {/* 2-col: Month Compare + Weekly Heatmap */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="ef-2col">
              {/* Month comparison */}
              <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'18px' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>
                  <i className="bi bi-arrow-left-right me-2 text-primary"/>Period Comparison
                </div>
                <MonthCompare current={s.total} previous={s.prevTotal} format={format}/>
              </div>

              {/* Weekly heatmap */}
              <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'18px' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>
                  <i className="bi bi-calendar-week me-2 text-primary"/>Weekly Pattern
                </div>
                <WeeklyHeatmap expenses={data.expenses}/>
                <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:10 }}>
                  Busiest day: <strong>{s.topDay||'—'}</strong>
                </div>
              </div>
            </div>

            {/* Stat cards row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="ef-4col">
              {[
                { icon:'💸', label:'Largest Transaction',
                  val: s.maxTransaction ? format(s.maxTransaction.amount) : '—',
                  sub: s.maxTransaction?.description?.slice(0,22) },
                { icon:'🔥', label:'Spending Streak',
                  val: s.spendingStreak ? `${s.spendingStreak}d` : '—',
                  sub: 'consecutive days' },
                { icon:'📊', label:'Avg per Transaction',
                  val: format(s.avgTxn||0),
                  sub: `${s.txnCount||0} total transactions` },
                { icon:'📈', label:'Savings Rate',
                  val: s.savingsPct!=null ? `${s.savingsPct}%` : '—',
                  sub: s.salary ? `Salary ₹${s.salary.toLocaleString('en-IN')}` : 'Set salary in Settings' },
              ].map(({icon,label,val,sub})=>(
                <div key={label} style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:28, flexShrink:0 }}>{icon}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--bs-secondary-color)' }}>{label}</div>
                    <div style={{ fontWeight:800, fontSize:15, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</div>
                    {sub && <div style={{ fontSize:10, color:'var(--bs-secondary-color)', marginTop:1 }} className="text-truncate">{sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ CATEGORIES ══════ */}
        {tab==='categories' && data.byCategory?.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Donut chart */}
            <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'20px' }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>
                <i className="bi bi-pie-chart-fill me-2" style={{color:'#6366f1'}}/>Category Breakdown
              </div>
              <Donut data={data.byCategory} total={s.total} size={180}/>
            </div>

            {/* Category bars */}
            <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16, padding:'20px' }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>
                <i className="bi bi-bar-chart-steps me-2" style={{color:'#6366f1'}}/>Spending Distribution
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {data.byCategory.map((c,i)=>{
                  const pct = s.total>0 ? Math.round(c.total/s.total*100) : 0;
                  const col = c.color || PALETTE[i%PALETTE.length];
                  return (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{c.icon} {c.name}</span>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                          <span style={{ fontSize:11, color:'var(--bs-secondary-color)' }}>{c.count} txns</span>
                          <span style={{ fontWeight:800, fontSize:13, color:col }}>{format(c.total)}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ flex:1, height:10, borderRadius:10, background:'var(--bs-border-color)', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:10, background:col, width:`${pct}%`, transition:'width .5s ease' }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:col, minWidth:28, textAlign:'right' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════ BUDGETS ══════ */}
        {tab==='budgets' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {!data.budgetHealth?.length ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-bullseye fs-2 d-block mb-2"/>No budgets set
              </div>
            ) : (<>
              {/* Overview strip */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:4 }}>
                {[
                  { label:'Total Budgeted', val: format(data.budgetHealth.reduce((s,b)=>s+b.budgeted,0)), color:'#6366f1' },
                  { label:'Total Spent',    val: format(data.budgetHealth.reduce((s,b)=>s+b.spent,0)),    color:'#f59e0b' },
                  { label:'Over Budget',    val: data.budgetHealth.filter(b=>b.isOver).length,             color:'#ef4444' },
                ].map(({label,val,color})=>(
                  <div key={label} style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--bs-secondary-color)', marginBottom:3 }}>{label}</div>
                    <div style={{ fontWeight:800, fontSize:16, color }}>{val}</div>
                  </div>
                ))}
              </div>

              {data.budgetHealth.map((b,i)=>{
                const col = b.isOver?'#ef4444':b.pct>75?'#f59e0b':'#22c55e';
                return (
                  <div key={i} style={{ background:'var(--bs-body-bg)', border:b.isOver?'1.5px solid rgba(239,68,68,0.3)':'0.5px solid var(--bs-border-color)', borderRadius:14, padding:'16px', display:'flex', alignItems:'center', gap:14 }}>
                    <Ring pct={Math.min(b.pct,100)} color={col} size={58}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{b.icon} {b.category}</div>
                      <div style={{ fontSize:12, color:'var(--bs-secondary-color)', marginTop:3 }}>
                        {format(b.spent)} spent of {format(b.budgeted)} budget
                      </div>
                      <div style={{ height:6, borderRadius:6, background:'var(--bs-border-color)', overflow:'hidden', marginTop:8 }}>
                        <div style={{ height:'100%', borderRadius:6, background:col, width:`${Math.min(b.pct,100)}%`, transition:'width .5s' }}/>
                      </div>
                    </div>
                    {b.isOver && (
                      <div style={{ textAlign:'center', flexShrink:0 }}>
                        <div style={{ fontSize:10, color:'#dc2626' }}>Over by</div>
                        <div style={{ fontWeight:800, fontSize:14, color:'#dc2626' }}>{format(b.spent-b.budgeted)}</div>
                      </div>
                    )}
                    {!b.isOver && (
                      <div style={{ textAlign:'center', flexShrink:0 }}>
                        <div style={{ fontSize:10, color:'#16a34a' }}>Remaining</div>
                        <div style={{ fontWeight:800, fontSize:14, color:'#16a34a' }}>{format(b.budgeted-b.spent)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>)}
          </div>
        )}

        {/* ══════ GOALS ══════ */}
        {tab==='goals' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {[
                {label:'Active Goals',   val:data.goals?.activeCount||0,           icon:'bi-trophy',      color:'#6366f1'},
                {label:'Completed',      val:data.goals?.completedCount||0,         icon:'bi-trophy-fill', color:'#22c55e'},
                {label:'Total Target',   val:format(data.goals?.totalTarget||0),    icon:'bi-bullseye',    color:'#f59e0b'},
                {label:'Total Saved',    val:format(data.goals?.totalSaved||0),     icon:'bi-piggy-bank',  color:'#22c55e'},
              ].map(({label,val,icon,color})=>(
                <div key={label} style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:12, padding:'14px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:color+'15',color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                    <i className={`bi ${icon}`}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--bs-secondary-color)' }}>{label}</div>
                    <div style={{ fontWeight:800, fontSize:17, color }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>

            {(data.goals?.totalTarget||0) > 0 && (
              <div style={{ background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:14, padding:'18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>Overall Progress</span>
                  <span style={{ fontWeight:800, fontSize:16, color:'#22c55e' }}>{data.goals?.progressPct||0}%</span>
                </div>
                <div style={{ height:14, borderRadius:14, background:'var(--bs-border-color)', overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', borderRadius:14, background:'linear-gradient(90deg,#6366f1,#22c55e)', width:`${data.goals?.progressPct||0}%`, transition:'width .6s ease' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--bs-secondary-color)' }}>
                  <span>{format(data.goals?.totalSaved||0)} saved</span>
                  <span>{format(data.goals?.totalTarget||0)} target</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ TRANSACTIONS ══════ */}
        {tab==='transactions' && (
          <div>
            {/* Search + Sort bar */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ flex:1, position:'relative', minWidth:160 }}>
                <i className="bi bi-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--bs-secondary-color)', fontSize:12 }}/>
                <input className="form-control form-control-sm" placeholder="Search transactions…"
                  style={{ paddingLeft:30, borderRadius:8 }}
                  value={txnSearch} onChange={e=>setTxnSearch(e.target.value)}/>
              </div>
              <select className="form-select form-select-sm" style={{ width:140, borderRadius:8 }}
                value={txnSort} onChange={e=>setTxnSort(e.target.value)}>
                <option value="date-desc">Date ↓ newest</option>
                <option value="date-asc">Date ↑ oldest</option>
                <option value="amount-desc">Amount ↓ high</option>
                <option value="amount-asc">Amount ↑ low</option>
              </select>
            </div>

            <div style={{ fontSize:12, color:'var(--bs-secondary-color)', marginBottom:10 }}>
              {filteredTxns.length} transaction{filteredTxns.length!==1?'s':''} · Total {format(filteredTxns.reduce((s,e)=>s+e.amount,0))}
            </div>

            {!filteredTxns.length ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-search fs-2 d-block mb-2"/>No transactions found
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filteredTxns.map((e,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {e.icon||'📦'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13 }} className="text-truncate">{e.description}</div>
                      <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:1 }}>
                        {e.category} · {new Date(e.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:15, color:'var(--bs-body-color)', flexShrink:0 }}>
                      {format(e.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </>)}

      {!data && !loading && !error && (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'var(--bs-body-bg)', border:'0.5px solid var(--bs-border-color)', borderRadius:16 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>📊</div>
          <h5 style={{ fontWeight:700 }}>Select a period to view analytics</h5>
          <p className="text-muted">Choose monthly or yearly view above</p>
        </div>
      )}

      <style>{`
        @media(min-width:576px){
          .ef-kpi-grid { grid-template-columns:repeat(4,1fr) !important; }
          .ef-4col     { grid-template-columns:repeat(4,1fr) !important; }
        }
        @media(min-width:480px){
          .ef-2col { grid-template-columns:1fr 1fr !important; }
        }
        @media(max-width:479px){
          .ef-2col { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}