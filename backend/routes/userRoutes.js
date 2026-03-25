const router = require('express').Router();
const User   = require('../models/User');
const Expense = require('../models/Expense');
const Budget  = require('../models/Budget');
const { protect } = require('../middleware/auth');

// PUT /api/users/settings
router.put('/settings', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { settings: req.body.settings },
      { new: true }
    ).select('-password');
    res.json({ success: true, data: user.settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/export
router.get('/export', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .populate('category', 'name')
      .sort({ date: -1 });

    let csv = 'Date,Category,Description,Amount,Notes\n';
    expenses.forEach(e => {
      const date = new Date(e.date).toLocaleDateString('en-IN');
      csv += `"${date}","${e.category?.name || 'Unknown'}","${e.description}","${e.amount}","${e.notes || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/account
router.delete('/account', protect, async (req, res) => {
  try {
    await Expense.deleteMany({ user: req.user._id });
    await Budget.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
