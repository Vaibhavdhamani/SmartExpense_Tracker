const router    = require('express').Router();
const Recurring = require('../models/Recurring');
const Expense   = require('../models/Expense');
const { protect } = require('../middleware/auth');

// ── Helpers ──────────────────────────────────────────────────────────────────

// Is this recurring item due today or overdue?
const isDue = (rec) => {
  if (!rec.isActive) return false;
  if (!rec.nextDueAt) return true;
  const now  = new Date();
  const due  = new Date(rec.nextDueAt);
  // Due = nextDueAt is today or in the past
  return due <= now;
};

// ── GET /api/recurring ── list all ───────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const items = await Recurring.find({ user: req.user._id })
      .populate('category', 'name icon color')
      .sort({ isActive: -1, nextDueAt: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/recurring/due ── items due today or overdue ─────────────────────
router.get('/due', protect, async (req, res) => {
  try {
    const now   = new Date();
    const items = await Recurring.find({
      user:     req.user._id,
      isActive: true,
      $or: [
        { nextDueAt: null },
        { nextDueAt: { $lte: now } },
      ]
    }).populate('category', 'name icon color');

    res.json({ success: true, data: items, count: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/recurring ── create ────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { category, amount, description, notes, frequency, dayOfMonth, dayOfWeek, startDate } = req.body;

    if (!category || !amount || !description)
      return res.status(400).json({ success: false, error: 'category, amount, description required' });

    const rec = new Recurring({
      user: req.user._id,
      category, amount, description,
      notes:      notes || '',
      frequency:  frequency  || 'monthly',
      dayOfMonth: dayOfMonth || 1,
      dayOfWeek:  dayOfWeek  || 1,
      startDate:  startDate  || new Date(),
    });

    // Set initial nextDueAt
    const base = startDate ? new Date(startDate) : new Date();
    rec.nextDueAt = rec.computeNextDue(base);

    await rec.save();
    await rec.populate('category', 'name icon color');
    res.status(201).json({ success: true, data: rec });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/recurring/:id ── update ─────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const rec = await Recurring.findOne({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, error: 'Not found' });

    const fields = ['category', 'amount', 'description', 'notes', 'frequency', 'dayOfMonth', 'dayOfWeek', 'isActive', 'endDate'];
    fields.forEach(f => { if (req.body[f] !== undefined) rec[f] = req.body[f]; });

    // Recompute nextDueAt if frequency/day changed
    if (req.body.frequency || req.body.dayOfMonth || req.body.dayOfWeek) {
      rec.nextDueAt = rec.computeNextDue(new Date());
    }

    await rec.save();
    await rec.populate('category', 'name icon color');
    res.json({ success: true, data: rec });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/recurring/:id/confirm ── user confirms → add expense ───────────
router.post('/:id/confirm', protect, async (req, res) => {
  try {
    const rec = await Recurring.findOne({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, error: 'Not found' });
    if (!rec.isActive) return res.status(400).json({ success: false, error: 'Recurring item is inactive' });

    // Create the actual expense
    const expense = await Expense.create({
      user:        req.user._id,
      category:    rec.category,
      amount:      req.body.amount  || rec.amount,
      description: req.body.description || rec.description,
      notes:       rec.notes,
      date:        req.body.date    || new Date(),
    });
    await expense.populate('category', 'name icon color');

    // Advance nextDueAt
    rec.lastAddedAt = new Date();
    rec.addCount    += 1;
    rec.nextDueAt   = rec.computeNextDue(new Date());

    // Auto-deactivate if endDate passed
    if (rec.endDate && rec.nextDueAt > new Date(rec.endDate)) {
      rec.isActive = false;
    }

    await rec.save();

    res.json({ success: true, data: { expense, recurring: rec } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/recurring/:id/skip ── skip this occurrence ─────────────────────
router.post('/:id/skip', protect, async (req, res) => {
  try {
    const rec = await Recurring.findOne({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, error: 'Not found' });

    // Just advance the due date without creating an expense
    rec.nextDueAt = rec.computeNextDue(new Date());
    await rec.save();
    await rec.populate('category', 'name icon color');

    res.json({ success: true, data: rec, message: 'Skipped this occurrence' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/recurring/:id ─────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const rec = await Recurring.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;