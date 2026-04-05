const router = require('express').Router();
const Goal   = require('../models/Goal');
const { protect } = require('../middleware/auth');

// ── GET /api/goals — list all ────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id })
      .sort({ isCompleted: 1, createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/goals/summary — totals ─────────────────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id, isActive: true });
    const totalTarget    = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved     = goals.reduce((s, g) => s + g.savedAmount,  0);
    const completedCount = goals.filter(g => g.isCompleted).length;
    const activeCount    = goals.filter(g => !g.isCompleted).length;
    res.json({
      success: true,
      data: { totalTarget, totalSaved, totalRemaining: totalTarget - totalSaved, completedCount, activeCount }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/goals — create ─────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, icon, color, targetAmount, targetDate, category, savedAmount } = req.body;
    if (!title || !targetAmount)
      return res.status(400).json({ success: false, error: 'title aur targetAmount required hain' });

    const goal = await Goal.create({
      user:         req.user._id,
      title:        String(title).trim(),
      description:  description  ? String(description).trim() : '',
      icon:         icon         || '🎯',
      color:        color        || '#6366f1',
      targetAmount: Number(targetAmount),
      savedAmount:  savedAmount  ? Number(savedAmount) : 0,
      targetDate:   targetDate   || null,
      category:     category     || 'other',
    });

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/goals/:id/deposit — add money to goal ─────────────────────────
router.post('/:id/deposit', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, error: 'Valid amount dalo' });

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });
    if (goal.isCompleted) return res.status(400).json({ success: false, error: 'Goal already completed' });

    goal.savedAmount = Math.min(goal.savedAmount + Number(amount), goal.targetAmount);

    // Auto-complete if target reached
    if (goal.savedAmount >= goal.targetAmount) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }

    await goal.save();
    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/goals/:id/withdraw — remove money from goal ───────────────────
router.post('/:id/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, error: 'Valid amount dalo' });

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });

    goal.savedAmount  = Math.max(goal.savedAmount - Number(amount), 0);
    goal.isCompleted  = false;
    goal.completedAt  = null;
    await goal.save();

    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/goals/:id — update ──────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });

    const fields = ['title','description','icon','color','targetAmount','targetDate','category','isActive'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) goal[f] = req.body[f];
    });

    // Re-check completion status if targetAmount changed
    if (goal.savedAmount >= goal.targetAmount && !goal.isCompleted) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }

    await goal.save();
    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/goals/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;