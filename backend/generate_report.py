"""
ExpenseFlow PDF Report Generator v2 — polished professional design
Usage: python3 generate_report.py <json_file_path> <output_pdf_path>
"""
import sys, json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable

W, H = A4

# ── Palette ──────────────────────────────────────────────────
C = {
  'primary':  colors.HexColor('#6366f1'),
  'success':  colors.HexColor('#22c55e'),
  'warning':  colors.HexColor('#f59e0b'),
  'danger':   colors.HexColor('#ef4444'),
  'info':     colors.HexColor('#06b6d4'),
  'dark':     colors.HexColor('#1e1b4b'),
  'gray':     colors.HexColor('#64748b'),
  'lgray':    colors.HexColor('#f8fafc'),
  'border':   colors.HexColor('#e2e8f0'),
  'white':    colors.white,
  'muted':    colors.HexColor('#94a3b8'),
}
CAT_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4',
              '#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b']

def ps(name, **kw):
    d = dict(fontName='Helvetica', fontSize=10, textColor=C['gray'], leading=15)
    d.update(kw)
    return ParagraphStyle(name, **d)

# ── Custom flowables ─────────────────────────────────────────
class HLine(Flowable):
    def __init__(self, w, color=None, thick=0.5):
        self.w, self.color, self.thick = w, color or C['border'], thick
    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thick)
        self.canv.line(0, 0, self.w, 0)
    def wrap(self, *a): return self.w, self.thick+2

class ColorRect(Flowable):
    def __init__(self, w, h, color, radius=6):
        self.bw, self.bh, self.color, self.radius = w, h, color, radius
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.bw, self.bh, self.radius, fill=1, stroke=0)
    def wrap(self, *a): return self.bw, self.bh

class ProgressBar(Flowable):
    def __init__(self, w, h, pct, color, bg=None):
        self.bw, self.bh = w, h
        self.pct   = min(max(pct, 0), 100)
        self.color = color
        self.bg    = bg or C['border']
    def draw(self):
        r = self.bh / 2
        self.canv.setFillColor(self.bg)
        self.canv.roundRect(0, 0, self.bw, self.bh, r, fill=1, stroke=0)
        fw = self.bw * self.pct / 100
        if fw > r * 2:
            self.canv.setFillColor(self.color)
            self.canv.roundRect(0, 0, fw, self.bh, r, fill=1, stroke=0)
    def wrap(self, *a): return self.bw, self.bh

class MiniBarChart(Flowable):
    def __init__(self, data, w, h, color):
        self.data, self.bw, self.bh = data, w, h
        self.color = colors.HexColor(color) if isinstance(color, str) else color
    def draw(self):
        if not self.data: return
        mx   = max(d.get('total',0) for d in self.data) or 1
        n    = len(self.data)
        pad  = 2
        bw   = max((self.bw - pad*(n+1)) / n, 1)
        for i, d in enumerate(self.data):
            bh = max((d.get('total',0)/mx) * (self.bh - 8), 1)
            x  = pad + i*(bw+pad)
            y  = 4
            r  = min(bw*0.3, 2)
            self.canv.setFillColor(self.color)
            self.canv.roundRect(x, y, bw, bh, r, fill=1, stroke=0)
        self.canv.setStrokeColor(C['border'])
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 2, self.bw, 2)
    def wrap(self, *a): return self.bw, self.bh

# ── Page backgrounds ─────────────────────────────────────────
def cover_bg(canvas, doc):
    canvas.saveState()
    # Deep navy background
    canvas.setFillColor(C['dark'])
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Top accent stripe
    canvas.setFillColor(C['primary'])
    canvas.rect(0, H-5, W, 5, fill=1, stroke=0)
    # Bottom wave
    canvas.setFillColor(colors.HexColor('#312e81'))
    canvas.roundRect(-30, -30, W+60, 130, 80, fill=1, stroke=0)
    # Subtle grid dots
    canvas.setFillColor(colors.HexColor('#4338ca'))
    for x in range(40, int(W)-20, 28):
        for y in range(180, int(H)-80, 28):
            canvas.circle(x, y, 1.5, fill=1, stroke=0)
    # Footer text
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#6366f1'))
    canvas.drawCentredString(W/2, 18, 'ExpenseFlow Financial Report — Confidential')
    canvas.restoreState()

def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C['white'])
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Left accent
    canvas.setFillColor(C['primary'])
    canvas.rect(0, 0, 4, H, fill=1, stroke=0)
    # Top bar
    canvas.setFillColor(C['lgray'])
    canvas.rect(0, H-30, W, 30, fill=1, stroke=0)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(C['gray'])
    canvas.drawString(14, H-18, 'ExpenseFlow')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(W-14, H-18, f'Page {doc.page}')
    # Footer
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(C['muted'])
    canvas.drawCentredString(W/2, 12, 'Confidential — Generated by ExpenseFlow')
    canvas.restoreState()

# ── Section header helper ─────────────────────────────────────
def section(title, story, W_content):
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(title, ps('sh', fontName='Helvetica-Bold', fontSize=15,
                                       textColor=C['dark'], leading=20, spaceBefore=2)))
    story.append(HLine(W_content, C['border'], 0.5))
    story.append(Spacer(1, 3*mm))

# ── KPI box ───────────────────────────────────────────────────
def kpi(value, label, color=None):
    color = color or C['primary']
    return Table(
        [[Paragraph(str(value), ps('kv', fontName='Helvetica-Bold', fontSize=17,
                                    textColor=color, alignment=TA_CENTER, leading=21))],
         [Paragraph(label,      ps('kl', fontSize=8, textColor=C['gray'], alignment=TA_CENTER))]],
        colWidths=[40*mm],
        style=TableStyle([
            ('BACKGROUND',(0,0),(-1,-1), C['lgray']),
            ('BOX',(0,0),(-1,-1),0.5,color),
            ('TOPPADDING',(0,0),(-1,-1),8),
            ('BOTTOMPADDING',(0,0),(-1,-1),8),
            ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ])
    )

# ── Main generator ────────────────────────────────────────────
def generate(data, out_path):
    content_w = W - 34*mm   # usable width
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=18*mm, rightMargin=16*mm,
        topMargin=38*mm,  bottomMargin=20*mm,
    )

    MONTHS_L = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
    MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    s   = data.get('summary', {})
    per = data.get('period', 'monthly')
    yr  = data.get('year', '')
    mo  = data.get('month', 1)
    period_label = (f"{MONTHS_L[mo-1]} {yr}" if per=='monthly' else f"Year {yr}")

    story = []

    # ══════════════════════════════════════════════════════════
    # PAGE 1 — COVER
    # ══════════════════════════════════════════════════════════
    story.append(Spacer(1, 36*mm))

    story.append(Paragraph('ExpenseFlow', ps('ct', fontName='Helvetica-Bold',
        fontSize=34, textColor=C['white'], alignment=TA_CENTER, leading=42)))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(f'Financial Report · {period_label}',
        ps('cs', fontSize=14, textColor=colors.HexColor('#c7d2fe'), alignment=TA_CENTER)))
    story.append(Spacer(1, 12*mm))

    # Cover KPIs
    kpis = Table([[
        kpi(f"₹{int(s.get('total',0)):,}",       'Total Spent',    C['primary']),
        kpi(str(s.get('txnCount',0)),              'Transactions',   C['info']),
        kpi(s.get('topCategory','—')[:12],        'Top Category',   C['warning']),
        kpi(f"{s.get('savingsPct',0) or '—'}{'%' if s.get('savingsPct') is not None else ''}",
            'Savings Rate', C['success']),
    ]], colWidths=[40*mm]*4, hAlign='CENTER',
        style=TableStyle([
            ('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('LEFTPADDING',(0,0),(-1,-1),3),
            ('RIGHTPADDING',(0,0),(-1,-1),3),
        ])
    )
    story.append(kpis)
    story.append(Spacer(1, 10*mm))

    # Spending bar chart on cover
    if data.get('byTime'):
        story.append(Paragraph('Spending Trend', ps('cc', fontSize=10,
            textColor=colors.HexColor('#a5b4fc'), alignment=TA_CENTER)))
        story.append(Spacer(1, 4*mm))
        chart = MiniBarChart(data['byTime'][:31], content_w, 36*mm, '#6366f1')
        story.append(chart)

    story.append(Spacer(1, 12*mm))
    story.append(Paragraph('Confidential · Generated by ExpenseFlow',
        ps('cf', fontSize=9, textColor=colors.HexColor('#6366f1'), alignment=TA_CENTER)))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 2 — EXECUTIVE SUMMARY
    # ══════════════════════════════════════════════════════════
    section('Executive Summary', story, content_w)

    # 4 KPI row
    story.append(Table([[
        kpi(f"₹{int(s.get('total',0)):,}",      'Total Spent',      C['primary']),
        kpi(f"₹{int(s.get('avgDaily',0)):,}",   'Daily Average',    C['warning']),
        kpi(str(s.get('txnCount',0)),             'Transactions',     C['info']),
        kpi(f"₹{int(s.get('avgTxn',0)):,}",     'Avg Transaction',  C['success']),
    ]], colWidths=[40*mm]*4, hAlign='CENTER',
        style=TableStyle([
            ('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('LEFTPADDING',(0,0),(-1,-1),3),
            ('RIGHTPADDING',(0,0),(-1,-1),3),
        ])
    ))
    story.append(Spacer(1, 4*mm))

    # vs previous period
    if s.get('changesPct') is not None:
        chg = s['changesPct']
        arrow = '▲' if chg > 0 else '▼'
        chg_color = C['danger'] if chg > 0 else C['success']
        story.append(Table([[
            Paragraph(
                f"{arrow} {abs(chg)}% {'higher' if chg>0 else 'lower'} than previous {per} "
                f"(₹{int(s.get('prevTotal',0)):,})",
                ps('cmp', fontSize=10, textColor=chg_color, alignment=TA_CENTER)
            )
        ]], colWidths=[content_w],
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,-1), C['lgray']),
                ('TOPPADDING',(0,0),(-1,-1),8),
                ('BOTTOMPADDING',(0,0),(-1,-1),8),
            ])
        ))
        story.append(Spacer(1, 3*mm))

    # Salary row
    if s.get('salary'):
        saved = s.get('savingsAmount', 0) or 0
        pct   = s.get('savingsPct', 0) or 0
        saved_col = C['success'] if saved >= 0 else C['danger']
        story.append(Table([[
            Paragraph(f"<b>Salary:</b> ₹{int(s['salary']):,}/month",
                      ps('sl', fontSize=10, textColor=C['gray'])),
            Paragraph(
                f"<b>{'Saved' if saved>=0 else 'Overspent'}:</b> ₹{int(abs(saved)):,} ({abs(pct)}%)",
                ps('sr', fontSize=10, textColor=saved_col, alignment=TA_RIGHT)
            ),
        ]], colWidths=[content_w/2]*2,
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,-1), C['lgray']),
                ('TOPPADDING',(0,0),(-1,-1),7),
                ('BOTTOMPADDING',(0,0),(-1,-1),7),
                ('LEFTPADDING',(0,0),(-1,-1),12),
                ('RIGHTPADDING',(0,0),(-1,-1),12),
            ])
        ))
        story.append(Spacer(1, 3*mm))
        # Salary progress bar
        bar_pct = min(int((int(s.get('total',0))/s['salary'])*100), 100)
        bar_col = C['danger'] if bar_pct > 90 else C['warning'] if bar_pct > 70 else C['success']
        story.append(ProgressBar(content_w, 8, bar_pct, bar_col))
        story.append(Spacer(1, 1*mm))
        story.append(Paragraph(f"{bar_pct}% of salary spent",
            ps('bp', fontSize=8, textColor=C['muted'])))
        story.append(Spacer(1, 4*mm))

    # Key insights grid
    insights = []
    if s.get('topDay'):      insights.append(('📅','Busiest Day',       s['topDay']))
    if s.get('maxTransaction'):
        mx = s['maxTransaction']
        insights.append(('💸','Largest Purchase', f"₹{int(mx['amount']):,} — {mx['description'][:18]}"))
    if s.get('spendingStreak',0) > 0:
        insights.append(('🔥','Spending Streak',  f"{s['spendingStreak']} consecutive days"))
    if s.get('topCategoryPct',0) > 0:
        insights.append(('📊',f"{s.get('topCategory','—')[:14]} Share", f"{s['topCategoryPct']}% of spending"))

    if insights:
        story.append(Paragraph('Key Highlights', ps('kht', fontName='Helvetica-Bold',
            fontSize=12, textColor=C['dark'], leading=18, spaceAfter=4)))
        for icon, label, val in insights:
            story.append(Table([[
                Paragraph(icon, ps('ii', fontSize=14, alignment=TA_CENTER)),
                Paragraph(f'<b>{label}</b>', ps('il', fontSize=10, textColor=C['dark'])),
                Paragraph(val,               ps('iv', fontSize=10, textColor=C['gray'], alignment=TA_RIGHT)),
            ]], colWidths=[12*mm, 80*mm, content_w-92*mm],
                style=TableStyle([
                    ('LINEBELOW',(0,0),(-1,-1),0.3,C['border']),
                    ('TOPPADDING',(0,0),(-1,-1),6),
                    ('BOTTOMPADDING',(0,0),(-1,-1),6),
                    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                ])
            ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 3 — CATEGORY BREAKDOWN
    # ══════════════════════════════════════════════════════════
    by_cat = data.get('byCategory', [])
    if by_cat:
        section('Spending by Category', story, content_w)

        total   = s.get('total', 1) or 1
        max_amt = max(c.get('total',0) for c in by_cat) or 1

        # Table with visual bars
        hdr = [
            Paragraph('Category', ps('ch', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Share',    ps('ch', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_CENTER)),
            Paragraph('Trend',    ps('ch', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Amount',   ps('ch', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_RIGHT)),
            Paragraph('Txns',     ps('ch', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_CENTER)),
        ]
        rows = [hdr]
        for i, c in enumerate(by_cat[:10]):
            pct     = round(c.get('total',0)/total*100, 1)
            col_hex = c.get('color') or CAT_COLORS[i%len(CAT_COLORS)]
            col     = colors.HexColor(col_hex)
            bar_w   = max(int(pct/100 * 70*mm), 3)
            bar_cell = ProgressBar(70*mm, 8, pct, col)
            rows.append([
                Paragraph(f"{c.get('icon','')} {c.get('name','')[:18]}",
                           ps('cn', fontSize=9, textColor=C['dark'])),
                Paragraph(f"<b>{pct}%</b>",
                           ps('cp', fontName='Helvetica-Bold', fontSize=9,
                              textColor=col, alignment=TA_CENTER)),
                bar_cell,
                Paragraph(f"₹{int(c.get('total',0)):,}",
                           ps('cv', fontSize=9, textColor=C['gray'], alignment=TA_RIGHT,
                              fontName='Helvetica-Bold')),
                Paragraph(str(c.get('count',0)),
                           ps('cc', fontSize=9, textColor=C['muted'], alignment=TA_CENTER)),
            ])

        ct = Table(rows, colWidths=[52*mm,18*mm,72*mm,26*mm,14*mm],
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,0),C['dark']),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[C['white'],C['lgray']]),
                ('BOX',(0,0),(-1,-1),0.5,C['border']),
                ('INNERGRID',(0,0),(-1,-1),0.3,C['border']),
                ('TOPPADDING',(0,0),(-1,-1),7),
                ('BOTTOMPADDING',(0,0),(-1,-1),7),
                ('LEFTPADDING',(0,0),(-1,-1),8),
                ('RIGHTPADDING',(0,0),(-1,-1),8),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ])
        )
        story.append(ct)
        story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 4 — BUDGET HEALTH
    # ══════════════════════════════════════════════════════════
    bh = data.get('budgetHealth', [])
    if bh:
        section('Budget Health', story, content_w)

        # Summary stats
        tot_budgeted = sum(b.get('budgeted',0) for b in bh)
        tot_spent    = sum(b.get('spent',0) for b in bh)
        over_count   = sum(1 for b in bh if b.get('isOver'))
        story.append(Table([[
            kpi(f"₹{int(tot_budgeted):,}", 'Total Budgeted', C['primary']),
            kpi(f"₹{int(tot_spent):,}",    'Total Spent',    C['warning']),
            kpi(str(over_count),             'Over Budget',    C['danger']),
            kpi(str(len(bh)-over_count),     'On Track',       C['success']),
        ]], colWidths=[40*mm]*4, hAlign='CENTER',
            style=TableStyle([
                ('ALIGN',(0,0),(-1,-1),'CENTER'),
                ('LEFTPADDING',(0,0),(-1,-1),3),
                ('RIGHTPADDING',(0,0),(-1,-1),3),
            ])
        ))
        story.append(Spacer(1, 4*mm))

        hdr = [
            Paragraph('Category',  ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Progress',  ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Used',      ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_CENTER)),
            Paragraph('Spent',     ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_RIGHT)),
            Paragraph('Budget',    ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_RIGHT)),
            Paragraph('Status',    ps('bh', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_CENTER)),
        ]
        rows = [hdr]
        for b in bh:
            pct  = b.get('pct', 0)
            over = b.get('isOver', False)
            bar_col = C['danger'] if over else C['warning'] if pct>75 else C['success']
            status_txt   = 'OVER'    if over else ('WARNING' if pct>75 else 'OK')
            status_color = C['danger'] if over else C['warning'] if pct>75 else C['success']
            rows.append([
                Paragraph(f"{b.get('icon','')} {b.get('category','')[:16]}",
                           ps('bc', fontSize=9, textColor=C['dark'])),
                ProgressBar(70*mm, 8, min(pct,100), bar_col),
                Paragraph(f"<b>{pct}%</b>",
                           ps('bpct', fontName='Helvetica-Bold', fontSize=9,
                              textColor=bar_col, alignment=TA_CENTER)),
                Paragraph(f"₹{int(b.get('spent',0)):,}",
                           ps('bs', fontSize=9, textColor=C['gray'], alignment=TA_RIGHT)),
                Paragraph(f"₹{int(b.get('budgeted',0)):,}",
                           ps('bb', fontSize=9, textColor=C['gray'], alignment=TA_RIGHT)),
                Paragraph(f"<b>{status_txt}</b>",
                           ps('bst', fontName='Helvetica-Bold', fontSize=9,
                              textColor=status_color, alignment=TA_CENTER)),
            ])

        bt = Table(rows, colWidths=[46*mm,70*mm,16*mm,22*mm,22*mm,14*mm],
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,0),C['dark']),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[C['white'],C['lgray']]),
                ('BOX',(0,0),(-1,-1),0.5,C['border']),
                ('INNERGRID',(0,0),(-1,-1),0.3,C['border']),
                ('TOPPADDING',(0,0),(-1,-1),8),
                ('BOTTOMPADDING',(0,0),(-1,-1),8),
                ('LEFTPADDING',(0,0),(-1,-1),8),
                ('RIGHTPADDING',(0,0),(-1,-1),8),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ])
        )
        story.append(bt)
        story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 5 — TRANSACTION LIST
    # ══════════════════════════════════════════════════════════
    expenses = data.get('expenses', [])
    if expenses:
        section(f'All Transactions ({len(expenses)})', story, content_w)

        hdr = [
            Paragraph('Date',        ps('th', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Description', ps('th', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Category',    ps('th', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'])),
            Paragraph('Amount',      ps('th', fontName='Helvetica-Bold', fontSize=9, textColor=C['white'], alignment=TA_RIGHT)),
        ]
        rows = [hdr]
        running = 0
        for e in expenses:
            running += e.get('amount', 0)
            rows.append([
                Paragraph(str(e.get('date',''))[:10],
                           ps('td', fontSize=8, textColor=C['muted'])),
                Paragraph(str(e.get('description',''))[:36],
                           ps('td', fontSize=8, textColor=C['dark'])),
                Paragraph(f"{e.get('icon','')} {str(e.get('category',''))}",
                           ps('td', fontSize=8, textColor=C['gray'])),
                Paragraph(f"₹{int(e.get('amount',0)):,}",
                           ps('ta', fontName='Helvetica-Bold', fontSize=8, textColor=C['dark'], alignment=TA_RIGHT)),
            ])

        # Total row
        rows.append([
            Paragraph('', ps('x', fontSize=8)),
            Paragraph('', ps('x', fontSize=8)),
            Paragraph('<b>TOTAL</b>', ps('tt', fontName='Helvetica-Bold', fontSize=9,
                                          textColor=C['dark'], alignment=TA_RIGHT)),
            Paragraph(f"<b>₹{int(running):,}</b>",
                       ps('ta', fontName='Helvetica-Bold', fontSize=9,
                          textColor=C['primary'], alignment=TA_RIGHT)),
        ])

        tt = Table(rows, colWidths=[22*mm, 84*mm, 42*mm, 26*mm],
            style=TableStyle([
                ('BACKGROUND',(0,0),(-1,0),C['dark']),
                ('BACKGROUND',(0,-1),(-1,-1),C['lgray']),
                ('ROWBACKGROUNDS',(0,1),(-1,-2),[C['white'],C['lgray']]),
                ('BOX',(0,0),(-1,-1),0.5,C['border']),
                ('INNERGRID',(0,0),(-1,-1),0.3,C['border']),
                ('TOPPADDING',(0,0),(-1,-1),5),
                ('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1),7),
                ('RIGHTPADDING',(0,0),(-1,-1),7),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ])
        )
        story.append(tt)

    doc.build(story, onFirstPage=cover_bg, onLaterPages=page_bg)
    print(f'PDF → {out_path}')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python3 generate_report.py <json_file> <out_path>')
        sys.exit(1)

    json_file = sys.argv[1]
    out_path  = sys.argv[2]

    # Read JSON from file (avoids CLI arg size limits for large datasets)
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f'ERROR reading JSON file {json_file}: {e}', file=sys.stderr)
        sys.exit(1)

    try:
        generate(data, out_path)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f'ERROR generating PDF: {e}', file=sys.stderr)
        sys.exit(1)