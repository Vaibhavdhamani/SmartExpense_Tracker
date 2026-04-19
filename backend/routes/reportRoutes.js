/**
 * ExpenseFlow — Report Routes
 * PDF generated with PDFKit (pure Node.js — no Python needed)
 * Install: npm install pdfkit
 */
const router      = require('express').Router();
const Expense     = require('../models/Expense');
const Budget      = require('../models/Budget');
const User        = require('../models/User');
const { protect } = require('../middleware/auth');

// Safe optional Goal import
let Goal = null;
try { Goal = require('../models/Goal'); } catch (_) {}

// ── Date helpers ──────────────────────────────────────────────
function getRange(period, year, month) {
  if (period === 'monthly') return {
    start: new Date(year, month - 1, 1),
    end:   new Date(year, month,     0, 23, 59, 59, 999),
  };
  return {
    start: new Date(year,     0,  1),
    end:   new Date(year,    11, 31, 23, 59, 59, 999),
  };
}

function getPrev(period, year, month) {
  if (period === 'monthly') {
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    return getRange('monthly', py, pm);
  }
  return getRange('yearly', year - 1, 1);
}

// ── Group helpers ─────────────────────────────────────────────
function byCategory(expenses) {
  const m = {};
  expenses.forEach(e => {
    const k = e.category?.name || 'Others';
    if (!m[k]) m[k] = { name: k, icon: e.category?.icon || '', color: e.category?.color || '#6366f1', total: 0, count: 0 };
    m[k].total += e.amount;
    m[k].count += 1;
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}

function byDay(expenses) {
  const m = {};
  expenses.forEach(e => {
    const d = new Date(e.date), k = d.toISOString().slice(0, 10);
    if (!m[k]) m[k] = { key: k, label: String(d.getDate()), total: 0, count: 0 };
    m[k].total += e.amount; m[k].count++;
  });
  return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
}

function byMonth(expenses) {
  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = {};
  expenses.forEach(e => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!m[k]) m[k] = { key: k, label: MO[d.getMonth()], total: 0, count: 0 };
    m[k].total += e.amount; m[k].count++;
  });
  return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
}

// ── Build payload ─────────────────────────────────────────────
async function buildPayload(userId, period, year, month) {
  const { start, end }       = getRange(period, year, month);
  const { start: ps, end: pe } = getPrev(period, year, month);

  const [expenses, prevExpenses, budgets, user] = await Promise.all([
    Expense.find({ user: userId, date: { $gte: start, $lte: end } })
      .populate('category', 'name icon color').sort({ date: 1 }),
    Expense.find({ user: userId, date: { $gte: ps,    $lte: pe } })
      .populate('category', 'name icon color'),
    Budget.find({ user: userId, isActive: true }).populate('category', 'name icon color'),
    User.findById(userId).select('settings'),
  ]);

  let goals = [];
  if (Goal) { try { goals = await Goal.find({ user: userId }); } catch (_) {} }

  const total     = expenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
  const salary    = user?.settings?.monthlySalary || 0;
  const days      = Math.max(Math.ceil((end - start) / 86400000), 1);
  const cats      = byCategory(expenses);
  const timeline  = period === 'monthly' ? byDay(expenses) : byMonth(expenses);

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayMap    = [0,0,0,0,0,0,0];
  expenses.forEach(e => { dayMap[new Date(e.date).getDay()] += e.amount; });
  const topDayIdx = dayMap.indexOf(Math.max(...dayMap));
  const maxTxn    = expenses.length ? expenses.reduce((m, e) => e.amount > m.amount ? e : m) : null;

  const budgetHealth = budgets.map(b => {
    const spent = expenses
      .filter(e => e.category?._id?.toString() === b.category?._id?.toString())
      .reduce((s, e) => s + e.amount, 0);
    return {
      category: b.category?.name || '',
      icon:     b.category?.icon || '',
      color:    b.category?.color || '#6366f1',
      budgeted: b.amount, spent,
      pct: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
      isOver: spent > b.amount,
    };
  });

  const active    = goals.filter(g => !g.isCompleted);
  const completed = goals.filter(g =>  g.isCompleted);
  const tgt       = active.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const sav       = active.reduce((s, g) => s + (g.savedAmount  || 0), 0);

  return {
    period, year, month,
    summary: {
      total, prevTotal,
      changesPct:     prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
      avgDaily:       Math.round(total / days),
      txnCount:       expenses.length,
      avgTxn:         expenses.length ? Math.round(total / expenses.length) : 0,
      salary,
      savingsAmount:  salary > 0 ? salary - total : null,
      savingsPct:     salary > 0 ? Math.round(((salary - total) / salary) * 100) : null,
      topCategory:    cats[0]?.name || '—',
      topCategoryPct: cats[0] && total > 0 ? Math.round((cats[0].total / total) * 100) : 0,
      topDay:         DAY_NAMES[topDayIdx],
      maxTransaction: maxTxn ? { amount: maxTxn.amount, description: maxTxn.description || '', date: maxTxn.date } : null,
    },
    byCategory: cats,
    byTime: timeline,
    budgetHealth,
    goals: { activeCount: active.length, completedCount: completed.length, totalTarget: tgt, totalSaved: sav, progressPct: tgt > 0 ? Math.round((sav / tgt) * 100) : 0 },
    expenses: expenses.map(e => ({
      date:        e.date,
      description: e.description || '',
      category:    e.category?.name || 'Others',
      amount:      e.amount,
    })),
  };
}

// ── PDF Generator (pure PDFKit — no Python) ───────────────────
function generatePDF(data) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'ExpenseFlow Report' } });

  const s        = data.summary || {};
  const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const period   = data.period || 'monthly';
  const label    = period === 'monthly' ? `${MONTHS_L[(data.month||1)-1]} ${data.year}` : `Year ${data.year}`;

  const W       = 595.28;
  const MARGIN  = 40;
  const CONTENT = W - MARGIN * 2;

  // Colors
  const PRIMARY = '#6366f1';
  const SUCCESS = '#22c55e';
  const WARNING = '#f59e0b';
  const DANGER  = '#ef4444';
  const DARK    = '#1e1b4b';
  const GRAY    = '#64748b';
  const LGRAY   = '#f8fafc';
  const BORDER  = '#e2e8f0';
  const WHITE   = '#ffffff';

  const fmt = n => `Rs.${Math.round(n).toLocaleString('en-IN')}`;

  // ── Helper: draw progress bar ──────────────────────────────
  const progressBar = (x, y, w, h, pct, color, bg = '#e2e8f0') => {
    doc.rect(x, y, w, h).fill(bg);
    const fw = Math.max((Math.min(pct, 100) / 100) * w, 0);
    if (fw > 0) doc.rect(x, y, fw, h).fill(color);
  };

  // ── Helper: section header ─────────────────────────────────
  const sectionHead = (title) => {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.6)
      .fontSize(14).fillColor(DARK).font('Helvetica-Bold').text(title)
      .moveDown(0.15);
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveDown(0.4);
  };

  // ── Helper: KPI box ────────────────────────────────────────
  const kpiBox = (x, y, w, h, value, label, color) => {
    doc.rect(x, y, w, h).fill(LGRAY);
    doc.rect(x, y, w, 2).fill(color);
    doc.fontSize(16).fillColor(color).font('Helvetica-Bold')
      .text(value, x, y + 10, { width: w, align: 'center' });
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
      .text(label, x, y + 32, { width: w, align: 'center' });
  };

  // ══════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════

  // Background
  doc.rect(0, 0, W, 841.89).fill(DARK);
  doc.rect(0, 0, W, 4).fill(PRIMARY);

  // Title
  doc.fontSize(36).fillColor(WHITE).font('Helvetica-Bold')
    .text('ExpenseFlow', MARGIN, 180, { align: 'center', width: CONTENT });
  doc.fontSize(16).fillColor('#c7d2fe').font('Helvetica')
    .text(`Financial Report  |  ${label}`, MARGIN, 228, { align: 'center', width: CONTENT });

  // Cover KPIs
  const kpiBg = '#312e81';
  const kpis = [
    { v: fmt(s.total || 0),                          l: 'Total Spent',     c: PRIMARY },
    { v: String(s.txnCount || 0),                    l: 'Transactions',    c: '#06b6d4' },
    { v: (s.topCategory || '—').slice(0, 12),        l: 'Top Category',    c: WARNING },
    { v: s.savingsPct != null ? `${s.savingsPct}%` : '—', l: 'Savings Rate', c: SUCCESS },
  ];
  const kw = (CONTENT - 30) / 4;
  kpis.forEach((k, i) => {
    const kx = MARGIN + i * (kw + 10);
    doc.rect(kx, 290, kw, 68).fill(kpiBg);
    doc.rect(kx, 290, kw, 3).fill(k.c);
    doc.fontSize(18).fillColor(k.c).font('Helvetica-Bold')
      .text(k.v, kx, 300, { width: kw, align: 'center' });
    doc.fontSize(9).fillColor('#a5b4fc').font('Helvetica')
      .text(k.l, kx, 324, { width: kw, align: 'center' });
  });

  // Period comparison on cover
  if (s.changesPct !== null && s.changesPct !== undefined) {
    const arrow = s.changesPct > 0 ? '▲' : '▼';
    const chgColor = s.changesPct > 0 ? '#f87171' : '#4ade80';
    doc.fontSize(12).fillColor(chgColor).font('Helvetica')
      .text(`${arrow} ${Math.abs(s.changesPct)}% vs previous ${period}`, MARGIN, 400, { align: 'center', width: CONTENT });
  }

  doc.fontSize(9).fillColor('#6366f1').font('Helvetica')
    .text('Confidential  —  Generated by ExpenseFlow', MARGIN, 790, { align: 'center', width: CONTENT });

  // ══════════════════════════════════════════════════
  // PAGE 2 — SUMMARY
  // ══════════════════════════════════════════════════
  doc.addPage();

  sectionHead('Executive Summary');

  // 4 KPI boxes
  const kw2 = (CONTENT - 30) / 4;
  const sumKpis = [
    { v: fmt(s.total || 0),         l: 'Total Spent',       c: PRIMARY },
    { v: fmt(s.avgDaily || 0),      l: 'Daily Average',     c: WARNING },
    { v: String(s.txnCount || 0),   l: 'Transactions',      c: '#06b6d4' },
    { v: fmt(s.avgTxn || 0),        l: 'Avg Transaction',   c: SUCCESS },
  ];
  const ky = doc.y;
  sumKpis.forEach((k, i) => kpiBox(MARGIN + i*(kw2+10), ky, kw2, 54, k.v, k.l, k.c));
  doc.y = ky + 64;

  // Period vs previous
  if (s.changesPct !== null && s.changesPct !== undefined) {
    doc.moveDown(0.4);
    const arrow = s.changesPct > 0 ? '▲' : '▼';
    const cc = s.changesPct > 0 ? DANGER : SUCCESS;
    doc.rect(MARGIN, doc.y, CONTENT, 28).fill(LGRAY);
    doc.fontSize(10).fillColor(cc).font('Helvetica-Bold')
      .text(`${arrow} ${Math.abs(s.changesPct)}% ${s.changesPct > 0 ? 'higher' : 'lower'} than previous ${period}  (${fmt(s.prevTotal || 0)})`,
        MARGIN, doc.y + 8, { width: CONTENT, align: 'center' });
    doc.y += 36;
  }

  // Salary bar
  if (s.salary) {
    doc.moveDown(0.3);
    const spentPct = Math.min(Math.round((s.total / s.salary) * 100), 100);
    const barColor = spentPct > 90 ? DANGER : spentPct > 70 ? WARNING : SUCCESS;
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
      .text(`Salary: ${fmt(s.salary)}/month`, MARGIN, doc.y);
    doc.fontSize(10).fillColor(barColor).font('Helvetica')
      .text(`Saved: ${fmt(Math.abs(s.savingsAmount || 0))} (${Math.abs(s.savingsPct || 0)}%)`,
        MARGIN, doc.y, { align: 'right', width: CONTENT });
    doc.moveDown(0.3);
    progressBar(MARGIN, doc.y, CONTENT, 8, spentPct, barColor);
    doc.moveDown(0.1);
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
      .text(`${spentPct}% of salary spent this ${period}`, MARGIN, doc.y + 10);
    doc.y += 26;
  }

  // Insights grid
  const insights = [];
  if (s.topDay)          insights.push(['Busiest Day',       s.topDay]);
  if (s.maxTransaction)  insights.push(['Largest Purchase',  `${fmt(s.maxTransaction.amount)} — ${(s.maxTransaction.description || '').slice(0, 22)}`]);
  if (s.topCategoryPct)  insights.push([`${(s.topCategory||'').slice(0,14)} Share`, `${s.topCategoryPct}% of total spending`]);
  if (s.txnCount > 0)    insights.push(['Avg per Transaction', fmt(s.avgTxn || 0)]);

  if (insights.length) {
    sectionHead('Key Highlights');
    insights.forEach(([label, val]) => {
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT, doc.y).strokeColor(BORDER).lineWidth(0.4).stroke();
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label, MARGIN, doc.y + 5, { width: 80 });
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(val, MARGIN + 90, doc.y, { width: CONTENT - 90 });
      doc.y += 22;
    });
  }

  // ══════════════════════════════════════════════════
  // PAGE 3 — CATEGORIES
  // ══════════════════════════════════════════════════
  const cats = data.byCategory || [];
  if (cats.length) {
    doc.addPage();
    sectionHead('Spending by Category');

    const total = s.total || 1;
    const maxAmt = Math.max(...cats.map(c => c.total), 1);
    const CAT_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6'];

    // Table header
    const cols = { name: MARGIN, bar: MARGIN+100, pct: MARGIN+270, amt: MARGIN+310, cnt: MARGIN+390 };
    doc.rect(MARGIN, doc.y, CONTENT, 22).fill(DARK);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold');
    doc.text('Category',  cols.name, doc.y + 6, { width: 95 });
    doc.text('Usage',     cols.bar,  doc.y,     { width: 165 });
    doc.text('%',         cols.pct,  doc.y,     { width: 35, align:'right' });
    doc.text('Amount',    cols.amt,  doc.y,     { width: 75, align:'right' });
    doc.text('Txns',      cols.cnt,  doc.y,     { width: 40, align:'right' });
    doc.y += 22;

    cats.slice(0, 10).forEach((c, i) => {
      if (doc.y > 750) { doc.addPage(); }
      const pct    = Math.round(c.total / total * 100);
      const col    = c.color || CAT_COLORS[i % CAT_COLORS.length];
      const rowBg  = i % 2 === 0 ? WHITE : LGRAY;
      const rowH   = 24;

      doc.rect(MARGIN, doc.y, CONTENT, rowH).fill(rowBg);

      // Name
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
        .text(c.name.slice(0, 16), cols.name, doc.y + 7, { width: 95 });

      // Progress bar
      progressBar(cols.bar, doc.y + 8, 160, 8, pct, col, '#e2e8f0');

      // Pct
      doc.fontSize(9).fillColor(col).font('Helvetica-Bold')
        .text(`${pct}%`, cols.pct, doc.y + 7, { width: 35, align: 'right' });

      // Amount
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(fmt(c.total), cols.amt, doc.y + 7, { width: 75, align: 'right' });

      // Count
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(String(c.count), cols.cnt, doc.y + 7, { width: 40, align: 'right' });

      doc.y += rowH;
    });
  }

  // ══════════════════════════════════════════════════
  // PAGE 4 — BUDGET HEALTH
  // ══════════════════════════════════════════════════
  const bh = data.budgetHealth || [];
  if (bh.length) {
    doc.addPage();
    sectionHead('Budget Health');

    // Summary row
    const totBudgeted = bh.reduce((s, b) => s + b.budgeted, 0);
    const totSpent    = bh.reduce((s, b) => s + b.spent, 0);
    const overCnt     = bh.filter(b => b.isOver).length;
    const bKpis = [
      { v: fmt(totBudgeted),               l: 'Total Budgeted', c: PRIMARY },
      { v: fmt(totSpent),                  l: 'Total Spent',    c: WARNING },
      { v: String(overCnt),                l: 'Over Budget',    c: DANGER },
      { v: String(bh.length - overCnt),   l: 'On Track',       c: SUCCESS },
    ];
    const bkw = (CONTENT - 30) / 4;
    const bky = doc.y;
    bKpis.forEach((k, i) => kpiBox(MARGIN + i*(bkw+10), bky, bkw, 54, k.v, k.l, k.c));
    doc.y = bky + 64;
    doc.moveDown(0.3);

    // Table header
    doc.rect(MARGIN, doc.y, CONTENT, 22).fill(DARK);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold');
    const bc = { name: MARGIN, bar: MARGIN+100, pct: MARGIN+272, spent: MARGIN+310, budget: MARGIN+375, status: MARGIN+445 };
    doc.text('Category', bc.name, doc.y+6, { width:95 });
    doc.text('Progress',  bc.bar,  doc.y,   { width:165 });
    doc.text('Used',      bc.pct,  doc.y,   { width:35, align:'right' });
    doc.text('Spent',     bc.spent,doc.y,   { width:62, align:'right' });
    doc.text('Budget',    bc.budget,doc.y,  { width:62, align:'right' });
    doc.text('Status',    bc.status,doc.y,  { width:50, align:'center' });
    doc.y += 22;

    bh.forEach((b, i) => {
      if (doc.y > 750) { doc.addPage(); }
      const barCol = b.isOver ? DANGER : b.pct > 75 ? WARNING : SUCCESS;
      const rowBg  = i % 2 === 0 ? WHITE : LGRAY;
      const rowH   = 24;

      doc.rect(MARGIN, doc.y, CONTENT, rowH).fill(rowBg);
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
        .text((b.category || '').slice(0,16), bc.name, doc.y+7, { width:95 });
      progressBar(bc.bar, doc.y+8, 165, 8, Math.min(b.pct,100), barCol, '#e2e8f0');
      doc.fontSize(9).fillColor(barCol).font('Helvetica-Bold')
        .text(`${b.pct}%`, bc.pct, doc.y+7, { width:35, align:'right' });
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(fmt(b.spent),    bc.spent,  doc.y+7, { width:62, align:'right' });
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
        .text(fmt(b.budgeted), bc.budget, doc.y+7, { width:62, align:'right' });

      const statusText  = b.isOver ? 'OVER' : b.pct > 75 ? 'WARN' : 'OK';
      doc.fontSize(9).fillColor(barCol).font('Helvetica-Bold')
        .text(statusText, bc.status, doc.y+7, { width:50, align:'center' });

      doc.y += rowH;
    });
  }

  // ══════════════════════════════════════════════════
  // PAGE 5 — TRANSACTIONS
  // ══════════════════════════════════════════════════
  const expenses = data.expenses || [];
  if (expenses.length) {
    doc.addPage();
    sectionHead(`All Transactions (${expenses.length})`);

    // Table header
    doc.rect(MARGIN, doc.y, CONTENT, 22).fill(DARK);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold');
    const tc = { date: MARGIN, desc: MARGIN+62, cat: MARGIN+280, amt: MARGIN+390 };
    doc.text('Date',        tc.date, doc.y+6, { width:58 });
    doc.text('Description', tc.desc, doc.y,   { width:215 });
    doc.text('Category',    tc.cat,  doc.y,   { width:108 });
    doc.text('Amount',      tc.amt,  doc.y,   { width:80, align:'right' });
    doc.y += 22;

    let runningTotal = 0;
    expenses.forEach((e, i) => {
      if (doc.y > 760) { doc.addPage(); }
      runningTotal += e.amount;
      const rowBg = i % 2 === 0 ? WHITE : LGRAY;
      const rowH  = 20;

      doc.rect(MARGIN, doc.y, CONTENT, rowH).fill(rowBg);
      const dateStr = new Date(e.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text(dateStr, tc.date, doc.y+5, { width:58 });
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
        .text((e.description || '').slice(0, 38), tc.desc, doc.y, { width:215 });
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text((e.category || '').slice(0, 18), tc.cat, doc.y, { width:108 });
      doc.fontSize(8).fillColor(DARK).font('Helvetica-Bold')
        .text(fmt(e.amount), tc.amt, doc.y, { width:80, align:'right' });
      doc.y += rowH;
    });

    // Total row
    doc.rect(MARGIN, doc.y, CONTENT, 26).fill(LGRAY);
    doc.rect(MARGIN, doc.y, CONTENT, 2).fill(PRIMARY);
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
      .text('TOTAL', tc.cat, doc.y+7, { width:108 });
    doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
      .text(fmt(runningTotal), tc.amt, doc.y+7, { width:80, align:'right' });
    doc.y += 26;
  }

  return doc;
}

// ─────────────────────────────────────────────────────────────
// GET /api/reports/analytics
// ─────────────────────────────────────────────────────────────
router.get('/analytics', protect, async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const year   = parseInt(req.query.year)  || new Date().getFullYear();
    const month  = parseInt(req.query.month) || new Date().getMonth() + 1;
    res.json({ success: true, data: await buildPayload(req.user._id, period, year, month) });
  } catch (err) {
    console.error('[analytics]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/reports/csv
// ─────────────────────────────────────────────────────────────
router.get('/csv', protect, async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const year   = parseInt(req.query.year)  || new Date().getFullYear();
    const month  = parseInt(req.query.month) || new Date().getMonth() + 1;
    const { start, end } = getRange(period, year, month);
    const expenses = await Expense.find({ user: req.user._id, date: { $gte: start, $lte: end } })
      .populate('category', 'name').sort({ date: 1 });

    const MO    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const label = period === 'monthly' ? `${MO[month-1]}_${year}` : `Year_${year}`;
    const rows  = [
      ['Date','Description','Category','Amount (INR)'],
      ...expenses.map(e => [
        new Date(e.date).toLocaleDateString('en-IN'),
        `"${(e.description||'').replace(/"/g,'""')}"`,
        e.category?.name || 'Others',
        e.amount.toFixed(2),
      ]),
      [],
      ['','','TOTAL', expenses.reduce((s,e)=>s+e.amount,0).toFixed(2)],
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ExpenseFlow_${label}.csv"`);
    res.send('\uFEFF' + rows.map(r => r.join(',')).join('\n'));
  } catch (err) {
    console.error('[csv]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/reports/pdf  — PDFKit pure Node.js, no Python needed
// ─────────────────────────────────────────────────────────────
router.get('/pdf', protect, async (req, res) => {
  try {
    // Check pdfkit installed
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (_) {
      return res.status(500).json({
        success: false,
        error: 'pdfkit not installed. Run in backend folder: npm install pdfkit',
      });
    }

    const period = req.query.period || 'monthly';
    const year   = parseInt(req.query.year)  || new Date().getFullYear();
    const month  = parseInt(req.query.month) || new Date().getMonth() + 1;

    console.log(`[PDF] Generating: period=${period} year=${year} month=${month}`);

    const payload = await buildPayload(req.user._id, period, year, month);
    const doc     = generatePDF(payload);

    const MO       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const label    = period === 'monthly' ? `${MO[month-1]}_${year}` : `Year_${year}`;
    const filename = `ExpenseFlow_${label}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    doc.pipe(res);
    doc.end();

    console.log(`[PDF] Streamed: ${filename}`);
  } catch (err) {
    console.error('[PDF] Error:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;