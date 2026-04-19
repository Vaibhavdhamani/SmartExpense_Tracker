const router   = require('express').Router();
const Expense  = require('../models/Expense');
const Budget   = require('../models/Budget');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

// ── POST /api/ai/suggestions ─────────────────────────────────────────────────
// Analyzes spending and returns personalized saving suggestions + budget recs
router.post('/suggestions', protect, async (req, res) => {
  try {
    const { days = 90 } = req.body;
    const cutoff = new Date(Date.now() - Number(days) * 86400000);

    const [expenses, budgets, user] = await Promise.all([
      Expense.find({ user: req.user._id, date: { $gte: cutoff } })
        .populate('category', 'name icon color'),
      Budget.find({ user: req.user._id, isActive: true })
        .populate('category', 'name icon color'),
      User.findById(req.user._id).select('settings'),
    ]);

    if (expenses.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'At least 3 expenses are required to generate suggestions',
      });
    }

    const salary      = user?.settings?.monthlySalary || 0;
    const totalSpent  = expenses.reduce((s, e) => s + e.amount, 0);
    const avgMonthly  = totalSpent / (days / 30);

    // ── Category breakdown ────────────────────────────────────────────────────
    const catMap = {};
    expenses.forEach(e => {
      const id   = e.category?._id?.toString();
      const name = e.category?.name || 'Others';
      if (!catMap[id]) catMap[id] = {
        name, icon: e.category?.icon, color: e.category?.color,
        total: 0, count: 0, transactions: [],
      };
      catMap[id].total += e.amount;
      catMap[id].count += 1;
      catMap[id].transactions.push(e.amount);
    });

    const categories = Object.values(catMap).sort((a, b) => b.total - a.total);
    const catMonthly = categories.map(c => ({ ...c, monthly: c.total / (days / 30) }));

    // ── Saving suggestions engine ─────────────────────────────────────────────
    const suggestions = [];

    // 1. Top spending category — is it too high?
    if (catMonthly.length > 0) {
      const top = catMonthly[0];
      const topPct = (top.total / totalSpent) * 100;
      if (topPct > 35) {
        suggestions.push({
          type:     'overspend',
          priority: 'high',
          icon:     top.icon,
          color:    '#ef4444',
          title:    `Overspending on ${top.name}`,
          detail:   `${top.name} is taking up ${topPct.toFixed(0)}% of your total spending — that's quite high.`,
          saving:   Math.round(top.monthly * 0.20),
          action:   `Cut your ${top.name} budget by 20% — save ₹${Math.round(top.monthly * 0.20).toLocaleString('en-IN')}/month`,
        });
      }
    }

    // 2. Food & Dining — check if too frequent
    const food = catMonthly.find(c => c.name?.toLowerCase().includes('food') || c.name?.toLowerCase().includes('dining'));
    if (food) {
      const perTransaction = food.total / food.count;
      if (food.count / (days / 30) > 20) {
        suggestions.push({
          type:     'frequency',
          priority: 'medium',
          icon:     food.icon || '🍔',
          color:    '#f59e0b',
          title:    'Too many food orders',
          detail:   `You order food avg ${Math.round(food.count / (days / 30))} times/month — avg ₹${Math.round(perTransaction)} per order.`,
          saving:   Math.round(food.monthly * 0.30),
          action:   'Cook at home 2 days a week — could save up to 30% on food',
        });
      }
    }

    // 3. Entertainment / Streaming check
    const ent = catMonthly.find(c =>
      c.name?.toLowerCase().includes('entertainment') ||
      c.name?.toLowerCase().includes('streaming')
    );
    if (ent && ent.monthly > 500) {
      suggestions.push({
        type:     'subscription',
        priority: 'low',
        icon:     ent.icon || '🎬',
        color:    '#8b5cf6',
        title:    'Review entertainment subscriptions',
        detail:   `You're spending ₹${Math.round(ent.monthly).toLocaleString('en-IN')}/month on entertainment. Cancel unused subscriptions.`,
        saving:   Math.round(ent.monthly * 0.40),
        action:   'Cancel services you rarely use — could save up to 40%',
      });
    }

    // 4. Salary-based savings check
    if (salary > 0) {
      const savingsRate = ((salary - avgMonthly) / salary) * 100;
      if (savingsRate < 20) {
        suggestions.push({
          type:     'savings_rate',
          priority: 'high',
          icon:     '💰',
          color:    '#ef4444',
          title:    'Your savings rate is too low',
          detail:   `You're saving only ${savingsRate < 0 ? 0 : savingsRate.toFixed(0)}% of your salary. Financial experts recommend 20–30%.`,
          saving:   Math.round(salary * 0.20 - Math.max(salary - avgMonthly, 0)),
          action:   `Auto-transfer ₹${Math.round(salary * 0.20).toLocaleString('en-IN')} to savings every month`,
        });
      } else if (savingsRate > 40) {
        suggestions.push({
          type:     'invest',
          priority: 'low',
          icon:     '📈',
          color:    '#22c55e',
          title:    'Great savings — time to invest!',
          detail:   `You're saving ${savingsRate.toFixed(0)}% of your salary — excellent! Don't let it sit idle.`,
          saving:   0,
          action:   'Consider SIP or FD to grow your savings over time',
        });
      }
    }

    // 5. Large transactions analysis
    const allAmounts = expenses.map(e => e.amount);
    const avg = totalSpent / expenses.length;
    const bigTxns = expenses.filter(e => e.amount > avg * 3);
    if (bigTxns.length > 0) {
      const bigTotal = bigTxns.reduce((s, e) => s + e.amount, 0);
      suggestions.push({
        type:     'impulse',
        priority: 'medium',
        icon:     '⚡',
        color:    '#f59e0b',
        title:    `${bigTxns.length} bade purchases detected`,
        detail:   `${bigTxns.length} transactions are 3x above your average — ₹${bigTotal.toLocaleString('en-IN')} total. These may be impulse buys.`,
        saving:   Math.round(bigTotal * 0.50 / (days / 30)),
        action:   'Apply the 24-hour rule — wait a day before any large purchase',
      });
    }

    // 6. Shopping check
    const shopping = catMonthly.find(c => c.name?.toLowerCase().includes('shopping'));
    if (shopping && shopping.monthly > avgMonthly * 0.25) {
      suggestions.push({
        type:     'shopping',
        priority: 'medium',
        icon:     shopping.icon || '🛍️',
        color:    '#6366f1',
        title:    'Keep an eye on shopping',
        detail:   `Shopping costs ₹${Math.round(shopping.monthly).toLocaleString('en-IN')}/month — ${((shopping.total / totalSpent) * 100).toFixed(0)}% of your total.`,
        saving:   Math.round(shopping.monthly * 0.25),
        action:   'Use a wishlist — only buy if you still want it after a week',
      });
    }

    // ── Auto Budget Recommendations ───────────────────────────────────────────
    const existingBudgetCats = new Set(budgets.map(b => b.category?._id?.toString()));
    const budgetRecommendations = [];

    // 50/30/20 rule based recommendations
    const incomeBase = salary || avgMonthly * 1.3;

    const IDEAL_RATIOS = {
      'Food & Dining': 0.15,
      'Groceries':     0.10,
      'Transportation':0.10,
      'Entertainment': 0.05,
      'Shopping':      0.08,
      'Healthcare':    0.05,
      'Bills & Utilities': 0.10,
      'Education':     0.08,
      'Personal Care': 0.03,
    };

    catMonthly.slice(0, 6).forEach(cat => {
      const idealRatio = IDEAL_RATIOS[cat.name] || 0.08;
      const idealAmount = Math.round(incomeBase * idealRatio);
      const actualMonthly = Math.round(cat.monthly);
      const isOverBudget = actualMonthly > idealAmount * 1.1;
      const alreadyBudgeted = Array.from(existingBudgetCats).some(
        id => catMap[id]?.name === cat.name
      );

      budgetRecommendations.push({
        categoryName:  cat.name,
        categoryIcon:  cat.icon,
        categoryColor: cat.color,
        currentSpend:  actualMonthly,
        recommendedBudget: idealAmount,
        isOverBudget,
        alreadyBudgeted,
        savingPotential: isOverBudget ? actualMonthly - idealAmount : 0,
        reasoning: isOverBudget
          ? `Spending ₹${actualMonthly.toLocaleString('en-IN')}/month — ideal budget is ₹${idealAmount.toLocaleString('en-IN')}`
          : `Spending looks good — aim to keep it at ₹${idealAmount.toLocaleString('en-IN')}/month`,
      });
    });

    // Total potential savings
    const totalPotentialSaving = suggestions.reduce((s, sg) => s + (sg.saving || 0), 0);

    res.json({
      success: true,
      data: {
        suggestions,
        budgetRecommendations,
        insights: {
          avgMonthlySpend:    Math.round(avgMonthly),
          totalAnalyzed:      expenses.length,
          daysAnalyzed:       days,
          salary,
          savingsRate:        salary > 0 ? Math.round(((salary - avgMonthly) / salary) * 100) : null,
          totalPotentialSaving,
          topCategory:        catMonthly[0]?.name || '—',
          categoriesCount:    catMonthly.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;