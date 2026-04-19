/**
 * ExpenseFlow — Admin Routes
 * Base: /api/admin
 * All routes protected by: protect + adminOnly
 */
const router  = require('express').Router();
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// ── Safe model loader — won't crash if model file missing ─────
function loadModel(name, path) {
  try { return require(path); }
  catch (_) {
    try { return require(`../models/${name}`); }
    catch (_2) { return null; }
  }
}

const Expense   = loadModel('Expense',   '../models/Expense');
const Budget    = loadModel('Budget',    '../models/Budget');
const Goal      = loadModel('Goal',      '../models/Goal');
const Recurring = loadModel('Recurring', '../models/Recurring');

// Apply both middlewares to ALL admin routes
router.use(protect, adminOnly);

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const now       = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ── User stats ────────────────────────────────────────────
    const [totalUsers, activeUsers, newThisMonth, newLastMonth, adminCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
      User.countDocuments({ role: 'admin' }),
    ]);

    // ── Expense stats (safe — model may not exist) ────────────
    let totalExpenses = 0, expThisMonth = 0, expLastMonth = 0;
    let totalAmount   = 0, amountThisMonth = 0;
    let topSpenders   = [];
    let categorySpend = [];

    if (Expense) {
      [totalExpenses, expThisMonth, expLastMonth] = await Promise.all([
        Expense.countDocuments(),
        Expense.countDocuments({ date: { $gte: thisMonth } }),
        Expense.countDocuments({ date: { $gte: lastMonth, $lte: lastMonthEnd } }),
      ]);

      const [totRes, monthRes] = await Promise.all([
        Expense.aggregate([{ $group: { _id: null, t: { $sum: '$amount' } } }]),
        Expense.aggregate([
          { $match: { date: { $gte: thisMonth } } },
          { $group: { _id: null, t: { $sum: '$amount' } } },
        ]),
      ]);
      totalAmount      = totRes[0]?.t   || 0;
      amountThisMonth  = monthRes[0]?.t || 0;

      // Top spenders
      try {
        topSpenders = await Expense.aggregate([
          { $match: { date: { $gte: thisMonth } } },
          { $group: { _id: '$user', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { total: 1, count: 1, 'user.username': 1, 'user.email': 1 } },
        ]);
      } catch (_) { topSpenders = []; }

      // Category breakdown
      try {
        categorySpend = await Expense.aggregate([
          { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
          { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
          { $group: { _id: { $ifNull: ['$cat.name', 'Others'] }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 8 },
          { $project: { _id: 1, total: 1, count: 1 } },
        ]);
      } catch (_) { categorySpend = []; }
    }

    // ── Feature counts (safe) ─────────────────────────────────
    const [budgetCount, goalCount, recurringCount] = await Promise.all([
      Budget   ? Budget.countDocuments()    : Promise.resolve(0),
      Goal     ? Goal.countDocuments()      : Promise.resolve(0),
      Recurring? Recurring.countDocuments() : Promise.resolve(0),
    ]);

    // ── Daily signups last 7 days ─────────────────────────────
    const dailySignups = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      const count = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
      dailySignups.push({
        date:  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        count,
      });
    }

    res.json({
      success: true,
      data: {
        users: {
          total:        totalUsers,
          active:       activeUsers,
          inactive:     totalUsers - activeUsers,
          admins:       adminCount,
          newThisMonth,
          newLastMonth,
          growth: newLastMonth > 0
            ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
            : null,
        },
        expenses: {
          total:          totalExpenses,
          thisMonth:      expThisMonth,
          lastMonth:      expLastMonth,
          totalAmount,
          amountThisMonth,
        },
        features: {
          budgets:   budgetCount,
          goals:     goalCount,
          recurring: recurringCount,
        },
        topSpenders,
        dailySignups,
        categorySpend,
      },
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users  — paginated list with search/filter
// ─────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page   = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit) || 15, 50);
    const search = (req.query.search || '').trim();
    const role   = req.query.role;
    const status = req.query.status;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
      ];
    }
    if (role === 'admin' || role === 'user') query.role = role;
    if (status === 'active')   query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    // Enrich with expense data if Expense model exists
    let expMap = {};
    if (Expense && users.length) {
      try {
        const ids  = users.map(u => u._id);
        const rows = await Expense.aggregate([
          { $match: { user: { $in: ids } } },
          { $group: { _id: '$user', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        ]);
        rows.forEach(r => { expMap[r._id.toString()] = r; });
      } catch (_) {}
    }

    const enriched = users.map(u => ({
      ...u.toObject(),
      expenseCount: expMap[u._id.toString()]?.count || 0,
      totalSpent:   expMap[u._id.toString()]?.total || 0,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error('[admin/users]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users/:id  — single user detail
// ─────────────────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now       = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let expenses = [], budgets = [], goals = [];
    let totalSpent = 0, thisMonthSpent = 0;

    if (Expense) {
      try {
        expenses = await Expense.find({ user: user._id })
          .sort({ date: -1 }).limit(10)
          .populate('category', 'name icon color');
        totalSpent      = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        thisMonthSpent  = expenses
          .filter(e => new Date(e.date) >= thisMonth)
          .reduce((s, e) => s + (e.amount || 0), 0);
      } catch (_) {}
    }
    if (Budget) {
      try { budgets = await Budget.find({ user: user._id, isActive: true }).populate('category', 'name icon color'); }
      catch (_) {}
    }
    if (Goal) {
      try { goals = await Goal.find({ user: user._id }); }
      catch (_) {}
    }

    res.json({
      success: true,
      data: {
        user,
        summary: {
          totalExpenses: expenses.length,
          totalSpent,
          thisMonthSpent,
          budgetCount:   budgets.length,
          goalCount:     goals.length,
        },
        recentExpenses: expenses,
        budgets,
        goals,
      },
    });
  } catch (err) {
    console.error('[admin/users/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/role
// Body: { role: 'admin' | 'user' }
// ─────────────────────────────────────────────────────────────
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role))
      return res.status(400).json({ success: false, error: 'Role must be admin or user' });
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });

    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/status
// Body: { isActive: true | false }
// ─────────────────────────────────────────────────────────────
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });

    const user = await User.findByIdAndUpdate(
      req.params.id, { isActive }, { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user, message: `User ${isActive ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id
// ─────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    await Promise.all([
      Expense   ? Expense.deleteMany({ user: req.params.id })   : Promise.resolve(),
      Budget    ? Budget.deleteMany({ user: req.params.id })    : Promise.resolve(),
      Goal      ? Goal.deleteMany({ user: req.params.id })      : Promise.resolve(),
      Recurring ? Recurring.deleteMany({ user: req.params.id }) : Promise.resolve(),
      User.findByIdAndDelete(req.params.id),
    ]);

    res.json({ success: true, message: `User "${user.username}" and all data deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/expenses  — platform-wide expenses
// ─────────────────────────────────────────────────────────────
router.get('/expenses', async (req, res) => {
  try {
    if (!Expense) return res.json({ success: true, data: [], pagination: { total: 0, page: 1, pages: 1 } });

    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const query = req.query.userId ? { user: req.query.userId } : {};

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('user',     'username email')
        .populate('category', 'name icon color')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Expense.countDocuments(query),
    ]);

    res.json({
      success: true,
      data:       expenses,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error('[admin/expenses]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/reset-password
// Body: { newPassword: string }
// ─────────────────────────────────────────────────────────────
router.patch('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, error: 'Min 6 characters required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: `Password reset for ${user.username}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;