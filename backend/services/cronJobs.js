/**
 * ExpenseFlow — Cron Jobs (Production)
 * Install: npm install node-cron
 * Imported in server.js: require('./services/cronJobs')
 */
const cron = require('node-cron');
const { checkSubscriptionRenewals, sendMonthlyReport, checkEmiDue } = require('./emailTriggers');

// Daily 8:00 AM IST — EMI / Recurring due reminder (3 days before)
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] EMI due check...');
  await checkEmiDue();
}, { timezone: 'Asia/Kolkata' });

// Daily 9:00 AM IST — Subscription renewal check (7 days before)
cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Subscription renewal check...');
  await checkSubscriptionRenewals();
}, { timezone: 'Asia/Kolkata' });

// 1st of every month 8:30 AM IST — Monthly spending summary
cron.schedule('30 8 1 * *', async () => {
  console.log('[Cron] Monthly summary emails...');
  await sendMonthlyReport();
}, { timezone: 'Asia/Kolkata' });

console.log('✅ Cron jobs active:');
console.log('   🏦 EMI reminder       — daily 8:00 AM IST (3 days before due)');
console.log('   🔔 Subscription check — daily 9:00 AM IST (7 days before renewal)');
console.log('   📊 Monthly summary    — 1st of month 8:30 AM IST');