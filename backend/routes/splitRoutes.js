const router       = require('express').Router();
const SplitExpense = require('../models/SplitExpense');
const Expense      = require('../models/Expense');
const { protect }  = require('../middleware/auth');

// ── Helper: compute participant amounts ───────────────────────────────────────
function computeShares(totalAmount, participants, splitType) {
  const n = participants.length;
  if (splitType === 'equal') {
    const share = Math.round((totalAmount / n) * 100) / 100;
    const remainder = Math.round((totalAmount - share * n) * 100) / 100;
    return participants.map((p, i) => ({
      ...p,
      amount: i === 0 ? share + remainder : share, // give remainder to first person
    }));
  }
  if (splitType === 'percentage') {
    return participants.map(p => ({
      ...p,
      amount: Math.round((totalAmount * (p.percentage || 0) / 100) * 100) / 100,
    }));
  }
  // custom — amounts already set by user
  return participants;
}

// ── GET /api/splits — list all ────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const splits = await SplitExpense.find({ user: req.user._id })
      .populate('category', 'name icon color')
      .sort({ date: -1 });
    res.json({ success: true, data: splits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/splits/summary — totals ─────────────────────────────────────────
// Must come BEFORE /:id
router.get('/summary', protect, async (req, res) => {
  try {
    const splits = await SplitExpense.find({ user: req.user._id });
    const totalPaid    = splits.reduce((s, sp) => s + sp.totalAmount, 0);
    const totalOwed    = splits.reduce((s, sp) => s + (sp.amountOwed || 0), 0);
    const totalSettled = splits.filter(sp => sp.isSettled).reduce((s, sp) => s + sp.totalAmount, 0);
    const pendingCount = splits.filter(sp => !sp.isSettled).length;
    res.json({
      success: true,
      data: { totalPaid, totalOwed, totalSettled, pendingCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/splits/:id ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const split = await SplitExpense.findOne({ _id: req.params.id, user: req.user._id })
      .populate('category', 'name icon color');
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });
    res.json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/splits — create ─────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      category, title, description,
      totalAmount, date, participants,
      splitType, notes,
    } = req.body;

    if (!category || !title || !totalAmount || !participants?.length) {
      return res.status(400).json({
        success: false,
        error: 'category, title, totalAmount aur participants required hain',
      });
    }

    if (participants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Kam se kam 2 participants chahiye',
      });
    }

    // Validate custom split totals
    if (splitType === 'custom') {
      const sum = participants.reduce((s, p) => s + Number(p.amount || 0), 0);
      const diff = Math.abs(sum - Number(totalAmount));
      if (diff > 1) {
        return res.status(400).json({
          success: false,
          error: `Custom amounts ka total (${sum}) = totalAmount (${totalAmount}) hona chahiye`,
        });
      }
    }
    if (splitType === 'percentage') {
      const sumPct = participants.reduce((s, p) => s + Number(p.percentage || 0), 0);
      if (Math.abs(sumPct - 100) > 0.5) {
        return res.status(400).json({
          success: false,
          error: `Percentages ka total 100% hona chahiye (abhi ${sumPct}%)`,
        });
      }
    }

    const computedParticipants = computeShares(
      Number(totalAmount), participants, splitType || 'equal'
    );

    // Ensure exactly one creator
    const hasCreator = computedParticipants.some(p => p.isCreator);
    if (!hasCreator) computedParticipants[0].isCreator = true;

    const split = await SplitExpense.create({
      user:         req.user._id,
      category,
      title:        String(title).trim(),
      description:  description ? String(description).trim() : '',
      totalAmount:  Number(totalAmount),
      date:         date || new Date(),
      participants: computedParticipants,
      splitType:    splitType || 'equal',
      notes:        notes ? String(notes).trim() : '',
    });

    await split.populate('category', 'name icon color');
    res.status(201).json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/splits/:id/markpaid — mark one participant as paid ──────────────
router.post('/:id/markpaid', protect, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId)
      return res.status(400).json({ success: false, error: 'participantId required' });

    const split = await SplitExpense.findOne({ _id: req.params.id, user: req.user._id });
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });

    const participant = split.participants.id(participantId);
    if (!participant)
      return res.status(404).json({ success: false, error: 'Participant not found' });

    participant.isPaid  = true;
    participant.paidAt  = new Date();

    // Auto-settle if all non-creator participants paid
    const allPaid = split.participants
      .filter(p => !p.isCreator)
      .every(p => p.isPaid);
    if (allPaid) {
      split.isSettled  = true;
      split.settledAt  = new Date();
    }

    await split.save();
    await split.populate('category', 'name icon color');
    res.json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/splits/:id/unmarkpaid — undo mark paid ─────────────────────────
router.post('/:id/unmarkpaid', protect, async (req, res) => {
  try {
    const { participantId } = req.body;
    const split = await SplitExpense.findOne({ _id: req.params.id, user: req.user._id });
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });

    const participant = split.participants.id(participantId);
    if (!participant)
      return res.status(404).json({ success: false, error: 'Participant not found' });

    participant.isPaid  = false;
    participant.paidAt  = null;
    split.isSettled     = false;
    split.settledAt     = null;

    await split.save();
    await split.populate('category', 'name icon color');
    res.json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/splits/:id/settle — mark entire split as settled ────────────────
router.post('/:id/settle', protect, async (req, res) => {
  try {
    const split = await SplitExpense.findOne({ _id: req.params.id, user: req.user._id });
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });

    // Mark all non-creator participants as paid
    split.participants.forEach(p => {
      if (!p.isCreator) { p.isPaid = true; p.paidAt = new Date(); }
    });
    split.isSettled = true;
    split.settledAt = new Date();

    await split.save();
    await split.populate('category', 'name icon color');
    res.json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/splits/:id — update title/notes/date ────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const split = await SplitExpense.findOne({ _id: req.params.id, user: req.user._id });
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });

    ['title', 'description', 'notes', 'date'].forEach(f => {
      if (req.body[f] !== undefined) split[f] = req.body[f];
    });

    await split.save();
    await split.populate('category', 'name icon color');
    res.json({ success: true, data: split });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/splits/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const split = await SplitExpense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!split) return res.status(404).json({ success: false, error: 'Split not found' });
    res.json({ success: true, message: 'Split expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;