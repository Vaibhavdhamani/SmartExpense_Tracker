const router       = require('express').Router();
const Subscription = require('../models/Subscription');
const { protect }  = require('../middleware/auth');

// ── GET /api/subscriptions ────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.user._id })
      .sort({ nextRenewal: 1 });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/subscriptions/due  (BEFORE /:id) ─────────────────────────────────
router.get('/due', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const due = await Subscription.find({
      user:        req.user._id,
      isActive:    true,
      isCancelled: false,
      nextRenewal: { $lte: cutoff },
    }).sort({ nextRenewal: 1 });

    res.json({ success: true, data: due, count: due.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/subscriptions/summary ───────────────────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const subs   = await Subscription.find({ user: req.user._id, isCancelled: false });
    const active = subs.filter(s => s.isActive);

    const monthlyTotal = active.reduce((s, sub) => s + (sub.monthlyEquivalent || 0), 0);
    const yearlyTotal  = monthlyTotal * 12;

    const byCategory = {};
    active.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + (s.monthlyEquivalent || 0);
    });

    res.json({
      success: true,
      data: {
        activeCount:  active.length,
        totalCount:   subs.length,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        yearlyTotal:  Math.round(yearlyTotal  * 100) / 100,
        byCategory,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/subscriptions ───────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      name, description, icon, color, amount,
      billingCycle, category, startDate,
      reminderDays, website, notes,
    } = req.body;

    if (!name || !amount)
      return res.status(400).json({ success: false, error: 'name aur amount required hain' });

    const start      = startDate ? new Date(startDate) : new Date();
    const nextRenewal = Subscription.computeNextRenewal(start, billingCycle || 'monthly');

    const sub = await Subscription.create({
      user: req.user._id,
      name:         String(name).trim(),
      description:  description  ? String(description).trim()  : '',
      icon:         icon         || '📦',
      color:        color        || '#6366f1',
      amount:       Number(amount),
      billingCycle: billingCycle || 'monthly',
      category:     category     || 'other',
      startDate:    start,
      nextRenewal,
      reminderDays: reminderDays ? Number(reminderDays) : 3,
      website:      website      ? String(website).trim() : '',
      notes:        notes        ? String(notes).trim()   : '',
    });

    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/subscriptions/:id/renew ────────────────────────────────────────
router.post('/:id/renew', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });

    // Log renewal history
    sub.renewalHistory.push({ date: new Date(), amount: sub.amount });

    // Advance nextRenewal
    sub.nextRenewal = Subscription.computeNextRenewal(new Date(), sub.billingCycle);
    await sub.save();

    res.json({ success: true, data: sub, message: `Next renewal: ${sub.nextRenewal.toDateString()}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/subscriptions/:id ────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });

    const fields = ['name','description','icon','color','amount','billingCycle',
                    'category','reminderDays','website','notes','isActive'];
    fields.forEach(f => { if (req.body[f] !== undefined) sub[f] = req.body[f]; });

    // Recompute nextRenewal if billingCycle changed
    if (req.body.billingCycle) {
      sub.nextRenewal = Subscription.computeNextRenewal(new Date(), sub.billingCycle);
    }

    await sub.save();
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/subscriptions/:id/cancel ───────────────────────────────────────
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });

    sub.isCancelled = true;
    sub.isActive    = false;
    sub.cancelledAt = new Date();
    await sub.save();

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/subscriptions/:id ────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });
    res.json({ success: true, message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;