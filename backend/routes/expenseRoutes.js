const router  = require('express').Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// GET /api/expenses?days=30
router.get('/', protect, async (req, res) => {
  try {
    const { days = 30, category } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000);
    const query  = { user: req.user._id, date: { $gte: cutoff } };
    if (category) query.category = category;

    const expenses = await Expense.find(query)
      .populate('category', 'name icon color')
      .sort({ date: -1 });

    res.json({ success: true, data: expenses, count: expenses.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/expenses/summary?days=30
router.get('/summary', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000);

    const expenses = await Expense.find({ user: req.user._id, date: { $gte: cutoff } })
      .populate('category', 'name icon color');

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // Category breakdown
    const catMap = {};
    expenses.forEach(e => {
      const id = e.category._id.toString();
      if (!catMap[id]) catMap[id] = { category: e.category.name, icon: e.category.icon, color: e.category.color, total: 0, count: 0 };
      catMap[id].total += e.amount;
      catMap[id].count += 1;
    });
    const categoryBreakdown = Object.values(catMap).sort((a, b) => b.total - a.total);

    // Daily breakdown
    const dayMap = {};

expenses.forEach(e => {
  const d = new Date(e.date);

  const day =
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');

  dayMap[day] = (dayMap[day] || 0) + e.amount;
});

const dailyBreakdown = Object.entries(dayMap)
  .map(([date, total]) => ({ date, total }))
  .sort((a, b) => a.date.localeCompare(b.date));

    const amounts = expenses.map(e => e.amount);
    const stats = amounts.length > 0 ? {
      max: Math.max(...amounts),
      min: Math.min(...amounts),
      avg: total / amounts.length
    } : { max: 0, min: 0, avg: 0 };

    res.json({
      success: true,
      data: {
        totalSpending: total,
        periodDays:    Number(days),
        avgDaily:      total / Number(days),
        numTransactions: expenses.length,
        avgTransaction: stats.avg,
        maxTransaction: stats.max,
        categoryBreakdown,
        dailyBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/expenses
router.post('/', protect, async (req, res) => {
  try {
    const { category, amount, description, notes, date } = req.body;
    if (!category || !amount || !description)
      return res.status(400).json({ success: false, error: 'category, amount and description are required' });

    const expense = await Expense.create({
      user: req.user._id, category, amount, description, notes, date: date || new Date()
    });
    await expense.populate('category', 'name icon color');

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });

    const fields = ['category','amount','description','notes','date'];
    fields.forEach(f => { if (req.body[f] !== undefined) expense[f] = req.body[f]; });
    await expense.save();
    await expense.populate('category', 'name icon color');

    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
