const router  = require('express').Router();
const Budget  = require('../models/Budget');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// Helper: get period date range
const getPeriodRange = (period) => {
  const now = new Date();
  let start;
  if (period === 'daily') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end: new Date() };
};

// GET /api/budgets/status  ← must come BEFORE /:id
router.get('/status', protect, async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id, isActive: true })
      .populate('category', 'name icon color');

    const status = await Promise.all(budgets.map(async (b) => {
      const { start } = getPeriodRange(b.period);
      const spent = await Expense.aggregate([
        { $match: { user: req.user._id, category: b.category._id, date: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spentAmt = spent[0]?.total || 0;
      const remaining = b.amount - spentAmt;
      return {
        budgetId:       b._id,
        categoryId:     b.category._id,
        categoryName:   b.category.name,
        categoryIcon:   b.category.icon,
        categoryColor:  b.category.color,
        budgeted:       b.amount,
        spent:          spentAmt,
        remaining,
        percentageUsed: b.amount > 0 ? Math.round((spentAmt / b.amount) * 10000) / 100 : 0,
        period:         b.period,
        startDate:      b.startDate,
        isExceeded:     spentAmt > b.amount
      };
    }));

    const totalBudgeted = status.reduce((s, b) => s + b.budgeted, 0);
    const totalSpent    = status.reduce((s, b) => s + b.spent, 0);

    res.json({ success: true, data: { budgets: status, totalBudgeted, totalSpent, totalRemaining: totalBudgeted - totalSpent } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/budgets
router.get('/', protect, async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name icon color');
    res.json({ success: true, data: budgets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budgets
router.post('/', protect, async (req, res) => {
  try {
    const { category, amount, period, startDate } = req.body;
    if (!category || !amount) return res.status(400).json({ success: false, error: 'category and amount required' });

    // Prevent duplicate active budgets for same category
    const existing = await Budget.findOne({ user: req.user._id, category, isActive: true });
    if (existing) return res.status(400).json({ success: false, error: 'Active budget already exists for this category' });

    const budget = await Budget.create({ user: req.user._id, category, amount, period, startDate });
    await budget.populate('category', 'name icon color');
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/budgets/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });

    ['amount','period','startDate','isActive'].forEach(f => {
      if (req.body[f] !== undefined) budget[f] = req.body[f];
    });
    await budget.save();
    await budget.populate('category', 'name icon color');
    res.json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
