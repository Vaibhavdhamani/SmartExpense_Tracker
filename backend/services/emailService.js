/**
 * ExpenseFlow — Email Service
 * Uses Nodemailer + Gmail App Password
 * Install: npm install nodemailer
 */
const nodemailer = require('nodemailer');

// ── Transporter (Gmail) ───────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,   // Gmail App Password (16 chars)
    },
  });
  return transporter;
}

// ── Base HTML layout ──────────────────────────────────────────
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

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">💰</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
              ExpenseFlow
            </h1>
            <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;">Smart Expense Tracker</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;
            border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} ExpenseFlow · You received this because you have an account with us.<br/>
              <a href="#" style="color:#6366f1;text-decoration:none;">Manage Notifications</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Helper: stat box ──────────────────────────────────────────
function statBox(items) {
  const boxes = items.map(({ label, value, color }) => `
    <td style="text-align:center;padding:0 8px;">
      <div style="background:#f8fafc;border-radius:12px;padding:16px 12px;border:1px solid #e2e8f0;">
        <div style="font-size:22px;font-weight:800;color:${color || '#4F46E5'};">${value}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">${label}</div>
      </div>
    </td>
  `).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>${boxes}</tr>
  </table>`;
}

// ── Helper: progress bar ──────────────────────────────────────
function progressBar(pct, color = '#4F46E5') {
  const clamped = Math.min(pct, 100);
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : color;
  return `
    <div style="background:#e2e8f0;border-radius:99px;height:12px;overflow:hidden;margin:10px 0;">
      <div style="background:${barColor};height:100%;width:${clamped}%;border-radius:99px;
        transition:width 0.3s;"></div>
    </div>
    <div style="text-align:right;font-size:12px;color:${barColor};font-weight:700;">${pct}% used</div>
  `;
}

// ── Helper: button ────────────────────────────────────────────
function ctaButton(text, url = '#') {
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#4F46E5;color:#ffffff;
        padding:14px 36px;border-radius:99px;font-weight:700;font-size:14px;
        text-decoration:none;letter-spacing:0.3px;">
        ${text} →
      </a>
    </div>
  `;
}

// ── Helper: alert box ─────────────────────────────────────────
function alertBox(text, type = 'warning') {
  const styles = {
    warning: { bg: '#fffbeb', border: '#F59E0B', color: '#92400e', icon: '⚠️' },
    danger:  { bg: '#fef2f2', border: '#EF4444', color: '#991b1b', icon: '🚨' },
    success: { bg: '#f0fdf4', border: '#22C55E', color: '#166534', icon: '✅' },
    info:    { bg: '#eff6ff', border: '#3B82F6', color: '#1e40af', icon: 'ℹ️' },
  };
  const s = styles[type] || styles.info;
  return `
    <div style="background:${s.bg};border-left:4px solid ${s.border};
      border-radius:0 8px 8px 0;padding:14px 16px;margin:16px 0;">
      <p style="margin:0;color:${s.color};font-size:13px;font-weight:600;">
        ${s.icon} &nbsp;${text}
      </p>
    </div>
  `;
}

// ═════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═════════════════════════════════════════════════════════════

// 1. WELCOME EMAIL ─────────────────────────────────────────────
function welcomeHtml(username) {
  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:24px;font-weight:800;">
      Welcome, ${username}! 🎉
    </h2>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Your ExpenseFlow account is ready. Start tracking your expenses and take control of your finances today.
    </p>

    ${alertBox('Your account has been created successfully. You can now log in and start adding expenses.', 'success')}

    <h3 style="color:#1e293b;font-size:16px;margin:24px 0 16px;">🚀 What you can do:</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['💰', 'Track Expenses',    'Add daily expenses with categories'],
        ['📊', 'Smart Dashboard',   'View charts and spending insights'],
        ['🎯', 'Set Budgets',       'Create category-wise budget limits'],
        ['🤖', 'AI Predictions',    'ML-powered spending forecast'],
        ['📄', 'Export Reports',    'Download PDF & CSV reports'],
      ].map(([icon, title, desc]) => `
      <tr>
        <td style="padding:8px 0;vertical-align:top;width:40px;font-size:20px;">${icon}</td>
        <td style="padding:8px 0 8px 8px;">
          <strong style="color:#1e293b;font-size:14px;">${title}</strong>
          <div style="color:#64748b;font-size:12px;">${desc}</div>
        </td>
      </tr>`).join('')}
    </table>

    ${ctaButton('Open ExpenseFlow', 'http://localhost:3000/dashboard')}
  `;
  return baseTemplate(
    'Welcome to ExpenseFlow!',
    content,
    `Hi ${username}, your account is ready!`
  );
}

// 2. BUDGET ALERT EMAIL ────────────────────────────────────────
function budgetAlertHtml(username, category, spent, budget, pct) {
  const isOver    = pct >= 100;
  const alertType = isOver ? 'danger' : 'warning';
  const alertMsg  = isOver
    ? `You have exceeded your ${category} budget by ₹${(spent - budget).toLocaleString('en-IN')}!`
    : `You've used ${pct}% of your ${category} budget. Only ₹${(budget - spent).toLocaleString('en-IN')} remaining.`;

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:800;">
      ${isOver ? '🚨 Budget Exceeded!' : '⚠️ Budget Alert'}
    </h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">Hi ${username}, here's your budget status:</p>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:16px;font-weight:700;color:#1e293b;">${category}</span>
        <span style="font-size:14px;color:#64748b;">Monthly Budget</span>
      </div>
      ${progressBar(pct)}
      ${statBox([
        { label: 'Amount Spent',    value: `₹${spent.toLocaleString('en-IN')}`,   color: isOver ? '#EF4444' : '#F59E0B' },
        { label: 'Budget Limit',   value: `₹${budget.toLocaleString('en-IN')}`,  color: '#4F46E5' },
        { label: 'Remaining',      value: `₹${Math.max(budget-spent,0).toLocaleString('en-IN')}`, color: '#22C55E' },
      ])}
    </div>

    ${alertBox(alertMsg, alertType)}

    <h3 style="color:#1e293b;font-size:15px;margin:20px 0 12px;">💡 Quick Tips:</h3>
    <ul style="color:#64748b;font-size:13px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Review your recent ${category} expenses</li>
      <li>Consider adjusting your budget if needed</li>
      <li>Set a spending limit for remaining days</li>
    </ul>

    ${ctaButton('View Budget Details', 'http://localhost:3000/budgets')}
  `;
  return baseTemplate(
    `Budget Alert — ${category}`,
    content,
    `${pct}% of your ${category} budget used`
  );
}

// 3. GOAL COMPLETE EMAIL ───────────────────────────────────────
function goalCompleteHtml(username, goalTitle, targetAmount) {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:64px;margin-bottom:12px;">🏆</div>
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:24px;font-weight:800;">
        Goal Achieved!
      </h2>
      <p style="color:#64748b;font-size:15px;margin:0;">
        Congratulations ${username}, you've reached your savings goal!
      </p>
    </div>

    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;
      padding:24px;border:1px solid #86efac;text-align:center;margin-bottom:20px;">
      <div style="font-size:13px;color:#166534;font-weight:600;margin-bottom:6px;">GOAL COMPLETED</div>
      <div style="font-size:20px;font-weight:800;color:#15803d;">${goalTitle}</div>
      <div style="font-size:28px;font-weight:900;color:#16a34a;margin-top:8px;">
        ₹${targetAmount.toLocaleString('en-IN')}
      </div>
      <div style="font-size:12px;color:#4ade80;margin-top:4px;">Target Reached ✓</div>
    </div>

    ${progressBar(100, '#22C55E')}

    ${alertBox('Amazing work! Consistent saving has paid off. Ready to set your next goal?', 'success')}

    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:16px 0;">
      Financial discipline is a superpower. Keep the momentum going — every rupee saved today is an investment in your future. 🌟
    </p>

    ${ctaButton('Set Next Goal', 'http://localhost:3000/goals')}
  `;
  return baseTemplate(
    `Goal Completed — ${goalTitle}`,
    content,
    `You've saved ₹${targetAmount.toLocaleString('en-IN')} for ${goalTitle}!`
  );
}

// 4. SUBSCRIPTION RENEWAL EMAIL ───────────────────────────────
function subscriptionRenewalHtml(username, subscriptions) {
  const subRows = subscriptions.map(s => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px 8px;font-size:14px;color:#1e293b;font-weight:600;">${s.name}</td>
      <td style="padding:12px 8px;font-size:13px;color:#64748b;text-align:center;">${s.daysLeft} days</td>
      <td style="padding:12px 8px;font-size:14px;color:#4F46E5;font-weight:700;text-align:right;">
        ₹${s.amount.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const totalAmount = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  const content = `
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:800;">
      🔔 Upcoming Renewals
    </h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 20px;">
      Hi ${username}, these subscriptions are renewing soon:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:12px 8px;font-size:12px;color:#64748b;text-align:left;font-weight:600;">SERVICE</th>
          <th style="padding:12px 8px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">RENEWS IN</th>
          <th style="padding:12px 8px;font-size:12px;color:#64748b;text-align:right;font-weight:600;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${subRows}</tbody>
      <tfoot>
        <tr style="background:#f8fafc;">
          <td colspan="2" style="padding:12px 8px;font-size:13px;font-weight:700;color:#1e293b;">Total Due</td>
          <td style="padding:12px 8px;font-size:15px;font-weight:800;color:#4F46E5;text-align:right;">
            ₹${totalAmount.toLocaleString('en-IN')}
          </td>
        </tr>
      </tfoot>
    </table>

    ${alertBox('Make sure your payment method is up to date to avoid service interruptions.', 'info')}

    ${ctaButton('Manage Subscriptions', 'http://localhost:3000/subscriptions')}
  `;
  return baseTemplate(
    'Subscription Renewal Reminder',
    content,
    `${subscriptions.length} subscription(s) renewing soon`
  );
}

// 5. MONTHLY SUMMARY EMAIL ────────────────────────────────────
function monthlySummaryHtml(username, data) {
  const { month, totalSpent, salary, topCategory, txnCount, savedAmount, categories } = data;
  const savingsPct = salary > 0 ? Math.round((savedAmount / salary) * 100) : null;

  const catRows = (categories || []).slice(0, 5).map(c => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 8px;font-size:13px;color:#1e293b;">${c.icon || '📦'} ${c.name}</td>
      <td style="padding:10px 8px;font-size:13px;color:#4F46E5;font-weight:700;text-align:right;">
        ₹${c.total.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const content = `
    <h2 style="margin:0 0 4px;color:#1e293b;font-size:22px;font-weight:800;">
      📊 Monthly Summary
    </h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
      Hi ${username}, here's your spending summary for <strong>${month}</strong>:
    </p>

    ${statBox([
      { label: 'Total Spent',    value: `₹${totalSpent.toLocaleString('en-IN')}`,  color: '#4F46E5' },
      { label: 'Transactions',  value: txnCount,                                   color: '#F59E0B' },
      { label: 'Amount Saved',  value: `₹${Math.max(savedAmount,0).toLocaleString('en-IN')}`, color: '#22C55E' },
    ])}

    ${salary > 0 ? `
      <div style="margin:16px 0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;color:#64748b;">Salary utilization</span>
          <span style="font-size:13px;font-weight:700;color:#4F46E5;">${Math.round((totalSpent/salary)*100)}%</span>
        </div>
        ${progressBar(Math.round((totalSpent / salary) * 100))}
        ${savingsPct !== null ? alertBox(
          savingsPct >= 20
            ? `Great job! You saved ${savingsPct}% of your salary this month. 🌟`
            : `You saved only ${savingsPct}% this month. Try to save at least 20%.`,
          savingsPct >= 20 ? 'success' : 'warning'
        ) : ''}
      </div>
    ` : ''}

    ${catRows ? `
      <h3 style="color:#1e293b;font-size:15px;margin:20px 0 12px;">Top Spending Categories:</h3>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <tbody>${catRows}</tbody>
      </table>
    ` : ''}

    ${ctaButton('View Full Report', 'http://localhost:3000/analytics')}
  `;
  return baseTemplate(
    `Monthly Summary — ${month}`,
    content,
    `Your ${month} spending: ₹${totalSpent.toLocaleString('en-IN')}`
  );
}

// ═════════════════════════════════════════════════════════════
// SEND FUNCTIONS — call these from routes/cron
// ═════════════════════════════════════════════════════════════

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set in .env — skipping email');
    return false;
  }
  try {
    const info = await getTransporter().sendMail({
      from:    process.env.EMAIL_FROM || `ExpenseFlow <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to} — ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    return false;
  }
}

// Individual send helpers
exports.sendWelcome = (to, username) =>
  sendEmail({ to, subject: '🎉 Welcome to ExpenseFlow!', html: welcomeHtml(username) });

exports.sendBudgetAlert = (to, username, category, spent, budget, pct) =>
  sendEmail({
    to,
    subject: `${pct >= 100 ? '🚨' : '⚠️'} Budget ${pct >= 100 ? 'Exceeded' : 'Alert'} — ${category}`,
    html: budgetAlertHtml(username, category, spent, budget, pct),
  });

exports.sendGoalComplete = (to, username, goalTitle, targetAmount) =>
  sendEmail({
    to,
    subject: `🏆 Goal Achieved — ${goalTitle}!`,
    html: goalCompleteHtml(username, goalTitle, targetAmount),
  });

exports.sendSubscriptionRenewal = (to, username, subscriptions) =>
  sendEmail({
    to,
    subject: `🔔 ${subscriptions.length} Subscription(s) Renewing Soon`,
    html: subscriptionRenewalHtml(username, subscriptions),
  });

exports.sendMonthlySummary = (to, username, data) =>
  sendEmail({
    to,
    subject: `📊 Your ${data.month} Spending Summary`,
    html: monthlySummaryHtml(username, data),
  });

// Raw sender for custom use
exports.sendEmail = sendEmail;

// ─────────────────────────────────────────────────────────────
// 6. EMI / RECURRING DUE REMINDER EMAIL
// ─────────────────────────────────────────────────────────────
function emiReminderHtml(username, emis) {
  const totalDue = emis.reduce((s, e) => s + e.amount, 0);

  const rows = emis.map(e => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:14px 10px;">
        <div style="font-size:14px;font-weight:700;color:#1e293b;">${e.description}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${e.frequency} · Due ${e.dueDate}</div>
      </td>
      <td style="padding:14px 10px;text-align:center;">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;
          font-weight:700;background:${e.daysLeft <= 1 ? '#fef2f2' : e.daysLeft <= 3 ? '#fffbeb' : '#eff6ff'};
          color:${e.daysLeft <= 1 ? '#dc2626' : e.daysLeft <= 3 ? '#d97706' : '#2563eb'};">
          ${e.daysLeft === 0 ? 'Due Today!' : e.daysLeft === 1 ? 'Due Tomorrow' : `${e.daysLeft} days left`}
        </span>
      </td>
      <td style="padding:14px 10px;text-align:right;font-size:15px;font-weight:800;color:#4F46E5;">
        ₹${e.amount.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const urgentCount = emis.filter(e => e.daysLeft <= 1).length;

  const content = `
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px;font-weight:800;">
      🏦 EMI Payment Reminder
    </h2>
    <p style="color:#64748b;font-size:15px;margin:0 0 22px;">
      Hi ${username}, ${urgentCount > 0
        ? `<strong style="color:#dc2626;">${urgentCount} payment(s) are due today or tomorrow!</strong>`
        : 'the following EMIs are coming up soon:'}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:left;
            font-weight:700;letter-spacing:.05em;">EMI / PAYMENT</th>
          <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:center;
            font-weight:700;letter-spacing:.05em;">STATUS</th>
          <th style="padding:12px 10px;font-size:11px;color:#64748b;text-align:right;
            font-weight:700;letter-spacing:.05em;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f8fafc;">
          <td colspan="2" style="padding:14px 10px;font-size:14px;font-weight:700;color:#1e293b;">
            Total Due
          </td>
          <td style="padding:14px 10px;font-size:18px;font-weight:900;
            color:#4F46E5;text-align:right;">
            ₹${totalDue.toLocaleString('en-IN')}
          </td>
        </tr>
      </tfoot>
    </table>

    ${urgentCount > 0
      ? `<div style="background:#fef2f2;border-left:4px solid #EF4444;border-radius:0 8px 8px 0;
          padding:14px 16px;margin-bottom:20px;">
          <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">
            🚨 &nbsp;Action needed: Make sure funds are available in your bank account today to avoid penalties or late fees.
          </p>
        </div>`
      : `<div style="background:#eff6ff;border-left:4px solid #3B82F6;border-radius:0 8px 8px 0;
          padding:14px 16px;margin-bottom:20px;">
          <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;">
            💡 &nbsp;Tip: Keep sufficient balance ready in your account 2 days before each due date.
          </p>
        </div>`}

    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;
      margin-bottom:24px;border:1px solid #e2e8f0;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#1e293b;">📋 Quick Checklist:</h3>
      <div style="color:#64748b;font-size:13px;line-height:2.2;">
        ✓ &nbsp;Check bank account balance<br/>
        ✓ &nbsp;Enable auto-debit if not done<br/>
        ✓ &nbsp;Keep ₹${totalDue.toLocaleString('en-IN')} ready<br/>
        ✓ &nbsp;Confirm payment after due date
      </div>
    </div>

    <div style="text-align:center;margin:28px 0 8px;">
      <a href="http://localhost:3000/recurring"
        style="display:inline-block;background:#4F46E5;color:#ffffff;
        padding:14px 36px;border-radius:99px;font-weight:700;font-size:14px;
        text-decoration:none;letter-spacing:0.3px;">
        View Recurring Expenses →
      </a>
    </div>
  `;

  return baseTemplate(
    'EMI Payment Reminder',
    content,
    `${emis.length} EMI payment(s) due soon — Total ₹${totalDue.toLocaleString('en-IN')}`
  );
}

// Export EMI sender
exports.sendEmiReminder = (to, username, emis) =>
  sendEmail({
    to,
    subject: `🏦 EMI Reminder — ₹${emis.reduce((s,e)=>s+e.amount,0).toLocaleString('en-IN')} due ${emis.some(e=>e.daysLeft<=1) ? 'Today/Tomorrow' : 'soon'}`,
    html: emiReminderHtml(username, emis),
  });