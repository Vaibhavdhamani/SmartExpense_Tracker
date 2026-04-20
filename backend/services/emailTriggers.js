/**
 * ExpenseFlow — Email Triggers
 * Call these from existing routes when events happen
 *
 * HOW TO USE:
 *
 * In expenseRoutes.js (after saving expense):
 *   const { checkBudgetAlert } = require('../services/emailTriggers');
 *   await checkBudgetAlert(req.user._id, expense.category);
 *
 * In goalRoutes.js (after saving deposit):
 *   const { checkGoalComplete } = require('../services/emailTriggers');
 *   await checkGoalComplete(req.user._id, goal._id);
 */

const {
  sendBudgetAlert,
  sendGoalComplete,
  sendSubscriptionRenewal,
  sendMonthlySummary,
  sendEmiReminder,
} = require('./emailService');

const User = require('../models/User');

function model(name) {
  try { return require(`../models/${name}`); } catch (_) { return null; }
}
const Expense      = model('Expense');
const Budget       = model('Budget');
const Goal         = model('Goal');
const Subscription = model('Subscription');
const Recurring    = model('Recurring');

// ── 1. Budget Alert ───────────────────────────────────────────
// Call from expenseRoutes.js after every new expense
exports.checkBudgetAlert = async (userId, categoryId) => {
  try {
    if (!Budget || !Expense) return;
    const user = await User.findById(userId).select('email username settings');
    if (!user?.settings?.budgetAlerts) return;

    const budget = await Budget.findOne({
      user: userId, category: categoryId, isActive: true,
    }).populate('category', 'name');
    if (!budget) return;

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await Expense.aggregate([
      { $match: { user: userId, category: categoryId,
          date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const spent = result[0]?.total || 0;
    const pct   = Math.round((spent / budget.amount) * 100);

    if (pct >= 80) {
      await sendBudgetAlert(
        user.email, user.username,
        budget.category?.name || 'Category',
        spent, budget.amount, pct
      );
    }
  } catch (err) {
    console.error('[checkBudgetAlert]', err.message);
  }
};

// ── 2. Goal Complete ──────────────────────────────────────────
// Call from goalRoutes.js after every deposit
exports.checkGoalComplete = async (userId, goalId) => {
  try {
    if (!Goal) return;
    const [user, goal] = await Promise.all([
      User.findById(userId).select('email username'),
      Goal.findById(goalId),
    ]);
    if (!user || !goal) return;
    if (goal.savedAmount >= goal.targetAmount) {
      await sendGoalComplete(user.email, user.username, goal.title, goal.targetAmount);
    }
  } catch (err) {
    console.error('[checkGoalComplete]', err.message);
  }
};

// ── 3. Subscription Renewals (Cron: daily 9AM) ───────────────
exports.checkSubscriptionRenewals = async () => {
  try {
    if (!Subscription) return;
    const now     = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subs = await Subscription.find({
      isActive: true, isCancelled: false,
      nextRenewal: { $gte: now, $lte: in7Days },
    }).populate('user', 'email username settings');

    const byUser = {};
    subs.forEach(sub => {
      if (!sub.user) return;
      const uid      = sub.user._id.toString();
      if (!byUser[uid]) byUser[uid] = { user: sub.user, subs: [] };
      const daysLeft = Math.ceil((new Date(sub.nextRenewal) - now) / (1000*60*60*24));
      byUser[uid].subs.push({ name: sub.name, amount: sub.amount, daysLeft });
    });

    for (const { user, subs } of Object.values(byUser)) {
      if (user.settings?.emailNotifications === false) continue;
      await sendSubscriptionRenewal(user.email, user.username, subs);
      console.log(`[Email] Subscription reminder → ${user.email} (${subs.length} subs)`);
    }
  } catch (err) {
    console.error('[checkSubscriptionRenewals]', err.message);
  }
};

// ── 4. EMI / Recurring Due Reminder (Cron: daily 8AM) ────────
exports.checkEmiDue = async () => {
  try {
    if (!Recurring) return;
    const now     = new Date(); now.setHours(0,0,0,0);
    const in3Days = new Date(now.getTime() + 3*24*60*60*1000);
    in3Days.setHours(23,59,59,999);

    const dueItems = await Recurring.find({
      isActive: true,
      nextDueAt: { $gte: now, $lte: in3Days },
    }).populate('user', 'email username settings');

    const byUser = {};
    dueItems.forEach(item => {
      if (!item.user) return;
      const uid      = item.user._id.toString();
      if (!byUser[uid]) byUser[uid] = { user: item.user, items: [] };
      const due      = new Date(item.nextDueAt); due.setHours(0,0,0,0);
      const daysLeft = Math.round((due - now) / (1000*60*60*24));
      byUser[uid].items.push({
        description: item.description,
        amount:      item.amount,
        frequency:   item.frequency,
        daysLeft,
        dueDate: new Date(item.nextDueAt).toLocaleDateString('en-IN',
          { day:'2-digit', month:'short', year:'numeric' }),
      });
    });

    for (const { user, items } of Object.values(byUser)) {
      if (user.settings?.emailNotifications === false) continue;
      await sendEmiReminder(user.email, user.username, items);
      console.log(`[Email] EMI reminder → ${user.email} (${items.length} items)`);
    }
  } catch (err) {
    console.error('[checkEmiDue]', err.message);
  }
};

// ── 5. Monthly Report (Cron: 1st of month) ───────────────────
exports.sendMonthlyReport = async () => {
  try {
    if (!Expense) return;
    const now       = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const monthName = lastMonth.toLocaleDateString('en-IN',
      { month:'long', year:'numeric' });

    const users = await User.find({
      isActive: true, 'settings.weeklyReports': true,
    }).select('email username settings');

    for (const user of users) {
      try {
        const expenses = await Expense.find({
          user: user._id, date: { $gte: lastMonth, $lte: lastEnd },
        }).populate('category','name icon');
        if (!expenses.length) continue;

        const totalSpent  = expenses.reduce((s,e)=>s+e.amount,0);
        const salary      = user.settings?.monthlySalary || 0;
        const savedAmount = salary > 0 ? salary - totalSpent : 0;

        const catMap = {};
        expenses.forEach(e => {
          const n = e.category?.name || 'Others';
          if (!catMap[n]) catMap[n] = { name:n, icon:e.category?.icon||'📦', total:0 };
          catMap[n].total += e.amount;
        });

        await sendMonthlySummary(user.email, user.username, {
          month: monthName, totalSpent, salary, savedAmount,
          txnCount: expenses.length,
          categories: Object.values(catMap).sort((a,b)=>b.total-a.total),
        });
        console.log(`[Email] Monthly summary → ${user.email}`);
      } catch (e) {
        console.error(`[Monthly] Failed for ${user.email}:`, e.message);
      }
    }
  } catch (err) {
    console.error('[sendMonthlyReport]', err.message);
  }
};