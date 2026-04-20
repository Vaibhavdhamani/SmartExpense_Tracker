/**
 * ExpenseFlow — Cron Jobs
 * Install: npm install node-cron
 * Already imported in server.js via: require('./services/cronJobs')
 */
const cron = require('node-cron');
const {
  checkSubscriptionRenewals,
  sendMonthlyReport,
  checkEmiDue,
} = require('./emailTriggers');

// ── Daily 8:00 AM — EMI / Recurring due reminder ─────────────
// Sends email if any recurring item is due within 3 days
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Checking EMI / recurring due dates...');
  await checkEmiDue();
}, { timezone: 'Asia/Kolkata' });

// ── Daily 9:00 AM — Subscription renewal check ───────────────
// Sends email if any subscription renews within 7 days
cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Checking subscription renewals...');
  await checkSubscriptionRenewals();
}, { timezone: 'Asia/Kolkata' });

// ── 1st of every month at 8:30 AM — Monthly summary ──────────
// Sends spending summary to users who opted in (weeklyReports: true)
cron.schedule('30 8 1 * *', async () => {
  console.log('[Cron] Sending monthly summary emails...');
  await sendMonthlyReport();
}, { timezone: 'Asia/Kolkata' });

console.log('✅ Cron jobs active:');
console.log('   📅 EMI reminder       — daily 8:00 AM IST');
console.log('   🔔 Subscription check — daily 9:00 AM IST');
console.log('   📊 Monthly summary    — 1st of month 8:30 AM IST');