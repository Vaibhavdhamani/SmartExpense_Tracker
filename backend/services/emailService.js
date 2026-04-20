/**
 * ExpenseFlow — Email Service (Production Ready)
 * Uses Nodemailer + Gmail App Password
 *
 * Required ENV variables (add in Render → backend service → Environment):
 *   EMAIL_USER   = yourgmail@gmail.com
 *   EMAIL_PASS   = xxxx xxxx xxxx xxxx   (Gmail App Password - 16 chars)
 *   EMAIL_FROM   = ExpenseFlow <yourgmail@gmail.com>
 *   FRONTEND_URL = https://expensetrack.tech
 *
 * Install: npm install nodemailer
 */
const nodemailer = require('nodemailer');

// No hardcoded localhost - uses env variable
const APP_URL = (process.env.FRONTEND_URL || 'https://expensetrack.tech').replace(/\/$/, '');

let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in Render environment variables');
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return _transporter;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] Skipped - EMAIL_USER/EMAIL_PASS not set in Render env');
    return false;
  }
  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `ExpenseFlow <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`[Email] Sent to ${to} | ${subject} | ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to ${to} | ${err.message}`);
    return false;
  }
}

function baseTemplate(title, content, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#4F46E5;padding:28px 40px;text-align:center;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 12px;font-size:24px;">💰</span>
            <h1 style="margin:10px 0 4px;color:#ffffff;font-size:22px;font-weight:700;">ExpenseFlow</h1>
            <p style="margin:0;color:#c4b5fd;font-size:13px;">Smart Expense Tracker</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">${content}</td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} ExpenseFlow &nbsp;·&nbsp;
              <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">${APP_URL.replace('https://','')}</a>
            </p>
            <p style="margin:0;color:#cbd5e1;font-size:11px;">You received this because you have an ExpenseFlow account.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text, path) {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${APP_URL}${path}" style="display:inline-block;background:#4F46E5;color:#ffffff;
      padding:14px 36px;border-radius:99px;font-weight:700;font-size:14px;
      text-decoration:none;letter-spacing:0.3px;">${text} →</a></div>`;
}

function statBox(items) {
  const cells = items.map(({ label, value, color }) =>
    `<td style="text-align:center;padding:0 6px;">
      <div style="background:#f8fafc;border-radius:12px;padding:14px 10px;border:1px solid #e2e8f0;">
        <div style="font-size:20px;font-weight:800;color:${color||'#4F46E5'};">${value}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">${label}</div>
      </div></td>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>${cells}</tr></table>`;
}

function progressBar(pct) {
  const c = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#4F46E5';
  return `<div style="background:#e2e8f0;border-radius:99px;height:12px;overflow:hidden;margin:10px 0;">
    <div style="background:${c};height:100%;width:${Math.min(pct,100)}%;border-radius:99px;"></div></div>
    <div style="text-align:right;font-size:12px;color:${c};font-weight:700;">${pct}% used</div>`;
}

function alertBox(text, type='info') {
  const s={success:{bg:'#f0fdf4',border:'#22C55E',color:'#166534',icon:'✅'},
    warning:{bg:'#fffbeb',border:'#F59E0B',color:'#92400e',icon:'⚠️'},
    danger:{bg:'#fef2f2',border:'#EF4444',color:'#991b1b',icon:'🚨'},
    info:{bg:'#eff6ff',border:'#3B82F6',color:'#1e40af',icon:'ℹ️'}}[type];
  return `<div style="background:${s.bg};border-left:4px solid ${s.border};
    border-radius:0 8px 8px 0;padding:14px 16px;margin:16px 0;">
    <p style="margin:0;color:${s.color};font-size:13px;font-weight:600;">${s.icon}&nbsp; ${text}</p></div>`;
}

// ── 1. WELCOME ───────────────────────────────────────────────
function welcomeHtml(username) {
  const feats=[['💰','Track Expenses','Add daily expenses with 12 categories'],
    ['📊','Dashboard','Charts, trends and spending insights'],
    ['🎯','Budgets','Category-wise limits with auto alerts'],
    ['🤖','AI Predictions','ML-powered next month forecast'],
    ['📄','Reports','Download professional PDF & CSV'],
    ['🏆','Goals','Set savings targets and track progress']];
  const rows=feats.map(([i,t,d])=>`<tr>
    <td style="padding:8px 0;vertical-align:top;width:36px;font-size:18px;">${i}</td>
    <td style="padding:8px 0 8px 10px;">
      <strong style="color:#1e293b;font-size:14px;">${t}</strong>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">${d}</div>
    </td></tr>`).join('');
  const content=`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:24px;font-weight:800;">Welcome, ${username}! 🎉</h2>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">Your ExpenseFlow account is ready. Start tracking and take control of your finances today.</p>
    ${alertBox('Account created successfully. You can now log in and start adding expenses.','success')}
    <h3 style="color:#1e293b;font-size:15px;margin:24px 0 14px;">🚀 What you can do:</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${ctaButton('Open ExpenseFlow','/dashboard')}`;
  return baseTemplate('Welcome to ExpenseFlow!',content,`Hi ${username}, your account is ready!`);
}

// ── 2. BUDGET ALERT ──────────────────────────────────────────
function budgetAlertHtml(username, category, spent, budget, pct) {
  const isOver=pct>=100;
  const content=`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px;font-weight:800;">
      ${isOver?'🚨 Budget Exceeded!':'⚠️ Budget Alert'}</h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">Hi ${username},</p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;margin-bottom:16px;">
      <strong style="font-size:16px;color:#1e293b;">${category}</strong>
      ${progressBar(pct)}
      ${statBox([
        {label:'Spent',    value:`₹${spent.toLocaleString('en-IN')}`,               color:isOver?'#EF4444':'#F59E0B'},
        {label:'Budget',   value:`₹${budget.toLocaleString('en-IN')}`,              color:'#4F46E5'},
        {label:'Remaining',value:`₹${Math.max(budget-spent,0).toLocaleString('en-IN')}`,color:'#22C55E'},
      ])}
    </div>
    ${alertBox(isOver?`Budget exceeded by ₹${(spent-budget).toLocaleString('en-IN')}!`:`${pct}% used — ₹${(budget-spent).toLocaleString('en-IN')} remaining.`,isOver?'danger':'warning')}
    ${ctaButton('View Budgets','/budgets')}`;
  return baseTemplate(`Budget Alert — ${category}`,content,`${pct}% of ${category} budget used`);
}

// ── 3. GOAL COMPLETE ─────────────────────────────────────────
function goalCompleteHtml(username, goalTitle, targetAmount) {
  const content=`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:56px;margin-bottom:12px;">🏆</div>
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:24px;font-weight:800;">Goal Achieved!</h2>
      <p style="color:#64748b;font-size:15px;margin:0;">Congratulations ${username}!</p>
    </div>
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;
      padding:24px;border:1px solid #86efac;text-align:center;margin-bottom:20px;">
      <div style="font-size:12px;color:#166534;font-weight:700;margin-bottom:6px;">GOAL COMPLETED</div>
      <div style="font-size:20px;font-weight:800;color:#15803d;">${goalTitle}</div>
      <div style="font-size:30px;font-weight:900;color:#16a34a;margin:10px 0;">₹${targetAmount.toLocaleString('en-IN')}</div>
    </div>
    ${progressBar(100)}
    ${alertBox('Amazing! Ready to set your next savings goal?','success')}
    ${ctaButton('Set Next Goal','/goals')}`;
  return baseTemplate(`Goal Completed — ${goalTitle}`,content,
    `You saved ₹${targetAmount.toLocaleString('en-IN')} for ${goalTitle}!`);
}

// ── 4. SUBSCRIPTION RENEWAL ──────────────────────────────────
function subscriptionRenewalHtml(username, subscriptions) {
  const total=subscriptions.reduce((s,x)=>s+x.amount,0);
  const rows=subscriptions.map(s=>`
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px 10px;font-size:14px;color:#1e293b;font-weight:600;">${s.name}</td>
      <td style="padding:12px 10px;font-size:13px;color:#64748b;text-align:center;">${s.daysLeft} day${s.daysLeft!==1?'s':''}</td>
      <td style="padding:12px 10px;font-size:14px;color:#4F46E5;font-weight:700;text-align:right;">₹${s.amount.toLocaleString('en-IN')}</td>
    </tr>`).join('');
  const content=`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px;font-weight:800;">🔔 Upcoming Renewals</h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">Hi ${username}, these subscriptions renew soon:</p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:left;font-weight:700;">SERVICE</th>
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:center;font-weight:700;">RENEWS IN</th>
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;">AMOUNT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f8fafc;">
        <td colspan="2" style="padding:12px 10px;font-size:13px;font-weight:700;color:#1e293b;">Total Due</td>
        <td style="padding:12px 10px;font-size:16px;font-weight:800;color:#4F46E5;text-align:right;">₹${total.toLocaleString('en-IN')}</td>
      </tr></tfoot>
    </table>
    ${alertBox('Ensure your payment method is up to date to avoid interruptions.','info')}
    ${ctaButton('Manage Subscriptions','/subscriptions')}`;
  return baseTemplate('Subscription Renewal Reminder',content,
    `${subscriptions.length} subscription(s) renewing soon`);
}

// ── 5. MONTHLY SUMMARY ───────────────────────────────────────
function monthlySummaryHtml(username, data) {
  const {month,totalSpent,salary,savedAmount,txnCount,categories}=data;
  const savPct=salary>0?Math.round((savedAmount/salary)*100):null;
  const catRows=(categories||[]).slice(0,5).map(c=>`
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-size:13px;color:#1e293b;">${c.icon||'📦'} ${c.name}</td>
      <td style="padding:10px 8px;font-size:13px;color:#4F46E5;font-weight:700;text-align:right;">₹${c.total.toLocaleString('en-IN')}</td>
    </tr>`).join('');
  const content=`
    <h2 style="margin:0 0 4px;color:#1e293b;font-size:22px;font-weight:800;">📊 Monthly Summary</h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Hi ${username}, spending report for <strong>${month}</strong>:</p>
    ${statBox([
      {label:'Total Spent',  value:`₹${totalSpent.toLocaleString('en-IN')}`,              color:'#4F46E5'},
      {label:'Transactions', value:txnCount,                                               color:'#F59E0B'},
      {label:'Amount Saved', value:`₹${Math.max(savedAmount,0).toLocaleString('en-IN')}`, color:'#22C55E'},
    ])}
    ${salary>0?`<div style="margin:16px 0;">${progressBar(Math.round((totalSpent/salary)*100))}
      ${savPct!==null?alertBox(savPct>=20?`Great job! You saved ${savPct}% of your salary. 🌟`:`Saved only ${savPct}% this month. Aim for at least 20%.`,savPct>=20?'success':'warning'):''}
    </div>`:''}
    ${catRows?`<h3 style="color:#1e293b;font-size:15px;margin:20px 0 12px;">Top Categories:</h3>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <tbody>${catRows}</tbody></table>`:''}
    ${ctaButton('View Full Analytics','/analytics')}`;
  return baseTemplate(`Monthly Summary — ${month}`,content,
    `Your ${month} spending: ₹${totalSpent.toLocaleString('en-IN')}`);
}

// ── 6. EMI REMINDER ──────────────────────────────────────────
function emiReminderHtml(username, emis) {
  const totalDue=emis.reduce((s,e)=>s+e.amount,0);
  const urgentCount=emis.filter(e=>e.daysLeft<=1).length;
  const rows=emis.map(e=>{
    const bg=e.daysLeft<=1?'#fef2f2':e.daysLeft<=3?'#fffbeb':'#eff6ff';
    const fc=e.daysLeft<=1?'#dc2626':e.daysLeft<=3?'#d97706':'#2563eb';
    const lbl=e.daysLeft===0?'Due Today!':e.daysLeft===1?'Due Tomorrow':`${e.daysLeft} days left`;
    return `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:14px 10px;">
        <div style="font-size:14px;font-weight:700;color:#1e293b;">${e.description}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${e.frequency} · Due ${e.dueDate}</div>
      </td>
      <td style="padding:14px 10px;text-align:center;">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;
          font-size:11px;font-weight:700;background:${bg};color:${fc};">${lbl}</span>
      </td>
      <td style="padding:14px 10px;text-align:right;font-size:15px;
        font-weight:800;color:#4F46E5;">₹${e.amount.toLocaleString('en-IN')}</td>
    </tr>`;}).join('');
  const content=`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px;font-weight:800;">🏦 EMI Payment Reminder</h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">Hi ${username},
      ${urgentCount>0?`<strong style="color:#dc2626;">${urgentCount} payment(s) due today or tomorrow!</strong>`:'the following EMIs are coming up soon:'}</p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:left;font-weight:700;">EMI / PAYMENT</th>
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:center;font-weight:700;">STATUS</th>
        <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:right;font-weight:700;">AMOUNT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f8fafc;">
        <td colspan="2" style="padding:14px 10px;font-size:14px;font-weight:700;color:#1e293b;">Total Due</td>
        <td style="padding:14px 10px;font-size:18px;font-weight:900;color:#4F46E5;text-align:right;">₹${totalDue.toLocaleString('en-IN')}</td>
      </tr></tfoot>
    </table>
    ${urgentCount>0
      ?alertBox('Action needed: Ensure funds are available to avoid late fees or penalties.','danger')
      :alertBox('Tip: Keep sufficient balance ready 2 days before each due date.','info')}
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:20px 0;border:1px solid #e2e8f0;">
      <strong style="font-size:14px;color:#1e293b;">📋 Quick Checklist:</strong>
      <div style="color:#64748b;font-size:13px;line-height:2.2;margin-top:8px;">
        ✓ &nbsp;Check bank account balance<br/>
        ✓ &nbsp;Enable auto-debit if not done<br/>
        ✓ &nbsp;Keep ₹${totalDue.toLocaleString('en-IN')} ready<br/>
        ✓ &nbsp;Confirm payment after due date
      </div>
    </div>
    ${ctaButton('View Recurring Expenses','/recurring')}`;
  return baseTemplate('EMI Payment Reminder',content,
    `${emis.length} EMI(s) due — Total ₹${totalDue.toLocaleString('en-IN')}`);
}

// ── EXPORTS ──────────────────────────────────────────────────
exports.sendWelcome = (to, username) =>
  sendEmail({to, subject:'🎉 Welcome to ExpenseFlow!', html:welcomeHtml(username)});

exports.sendBudgetAlert = (to, username, category, spent, budget, pct) =>
  sendEmail({to, subject:`${pct>=100?'🚨 Budget Exceeded':'⚠️ Budget Alert'} — ${category}`,
    html:budgetAlertHtml(username,category,spent,budget,pct)});

exports.sendGoalComplete = (to, username, goalTitle, targetAmount) =>
  sendEmail({to, subject:`🏆 Goal Achieved — ${goalTitle}!`,
    html:goalCompleteHtml(username,goalTitle,targetAmount)});

exports.sendSubscriptionRenewal = (to, username, subscriptions) =>
  sendEmail({to, subject:`🔔 ${subscriptions.length} Subscription(s) Renewing Soon`,
    html:subscriptionRenewalHtml(username,subscriptions)});

exports.sendMonthlySummary = (to, username, data) =>
  sendEmail({to, subject:`📊 Your ${data.month} Spending Summary`,
    html:monthlySummaryHtml(username,data)});

exports.sendEmiReminder = (to, username, emis) =>
  sendEmail({to,
    subject:`🏦 EMI Reminder — ₹${emis.reduce((s,e)=>s+e.amount,0).toLocaleString('en-IN')} due ${emis.some(e=>e.daysLeft<=1)?'Today/Tomorrow':'soon'}`,
    html:emiReminderHtml(username,emis)});

exports.sendEmail = sendEmail;