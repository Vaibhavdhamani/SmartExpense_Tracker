const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Category = require('../models/Category');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

// ── Seed default categories if none exist ─────────────────────────────────────
const seedCategories = async () => {
  const count = await Category.countDocuments();
  if (count > 0) return;
  const defaults = [
    { name: 'Food & Dining',     icon: '🍔', color: '#ef4444', descriptions: ['Restaurant','Fast Food','Coffee Shop','Home Delivery','Other'] },
    { name: 'Transportation',    icon: '🚗', color: '#3b82f6', descriptions: ['Fuel/Gas','Public Transit','Taxi/Uber','Parking','Vehicle Maintenance','Other'] },
    { name: 'Shopping',          icon: '🛍️', color: '#8b5cf6', descriptions: ['Clothing','Electronics','Home Items','Gifts','Online Shopping','Other'] },
    { name: 'Entertainment',     icon: '🎬', color: '#ec4899', descriptions: ['Movies','Concerts','Streaming Services','Games','Sports','Other'] },
    { name: 'Bills & Utilities', icon: '⚡', color: '#f59e0b', descriptions: ['Electricity','Water','Internet','Phone Bill','Insurance','Other'] },
    { name: 'Healthcare',        icon: '🏥', color: '#10b981', descriptions: ['Doctor Visit','Medicines','Lab Tests','Hospital','Pharmacy','Other'] },
    { name: 'Education',         icon: '📚', color: '#6366f1', descriptions: ['Tuition Fees','Books','Courses','Supplies','Other'] },
    { name: 'Travel',            icon: '✈️', color: '#14b8a6', descriptions: ['Flight','Hotel','Vacation','Travel Insurance','Other'] },
    { name: 'Housing',           icon: '🏠', color: '#f97316', descriptions: ['Rent','Mortgage','Property Tax','Home Maintenance','Other'] },
    { name: 'Groceries',         icon: '🛒', color: '#22c55e', descriptions: ['Supermarket','Local Market','Organic Store','Other'] },
    { name: 'Personal Care',     icon: '💅', color: '#a855f7', descriptions: ['Salon','Gym','Spa','Cosmetics','Other'] },
    { name: 'Others',            icon: '📝', color: '#64748b', descriptions: ['Miscellaneous','Other'] },
  ];
  await Category.insertMany(defaults);
  console.log('✅ Default categories seeded');
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: 'All fields required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({ success: false, error: 'Email or username already in use' });

    const user = await User.create({ username, email, password });
    await seedCategories();

    res.status(201).json({
      success: true,
      token: signToken(user._id),
      user: { id: user._id, username: user.username, email: user.email, settings: user.settings }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, error: 'Invalid credentials' });

    res.json({
      success: true,
      token: signToken(user._id),
      user: { id: user._id, username: user.username, email: user.email, settings: user.settings }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
const { protect } = require('../middleware/auth');
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: { id: req.user._id, username: req.user.username, email: req.user.email, settings: req.user.settings } });
});

module.exports = router;
