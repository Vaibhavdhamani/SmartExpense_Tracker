const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect }     = require('../middleware/auth');
const { sendWelcome } = require('../services/emailService');

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success:false, error:'All fields required' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ success:false, error:'Email already registered' });
    if (await User.findOne({ username }))
      return res.status(400).json({ success:false, error:'Username taken' });

    const count = await User.countDocuments();
    const role  = count === 0 ? 'admin' : 'user';
    const user  = await User.create({ username, email, password, role });

    try {
      const Category = require('../models/Category');
      const defaults = [
        {name:'Food & Dining',icon:'🍔',color:'#EF4444'},
        {name:'Transportation',icon:'🚗',color:'#F59E0B'},
        {name:'Housing',icon:'🏠',color:'#3B82F6'},
        {name:'Shopping',icon:'🛍️',color:'#8B5CF6'},
        {name:'Entertainment',icon:'🎬',color:'#EC4899'},
        {name:'Healthcare',icon:'🏥',color:'#10B981'},
        {name:'Education',icon:'📚',color:'#F97316'},
        {name:'Bills & Utilities',icon:'⚡',color:'#6366F1'},
        {name:'Travel',icon:'✈️',color:'#14B8A6'},
        {name:'Fitness',icon:'💪',color:'#84CC16'},
        {name:'Personal Care',icon:'💅',color:'#F43F5E'},
        {name:'Others',icon:'📦',color:'#64748B'},
      ];
      await Category.insertMany(defaults.map(d => ({ ...d, user: user._id, isDefault: true })));
    } catch (_) {}

    // Non-blocking welcome email
    sendWelcome(user.email, user.username).catch(err =>
      console.error('[Email] Welcome failed:', err.message)
    );

    res.status(201).json({
      success: true,
      token: makeToken(user),
      user: { _id:user._id, username:user.username, email:user.email,
              role:user.role, isActive:user.isActive, settings:user.settings },
    });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ success:false, error:err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, error:'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ success:false, error:'Invalid credentials' });
    if (!user.isActive)
      return res.status(403).json({ success:false, error:'Account deactivated. Contact admin.' });
    if (!await user.matchPassword(password))
      return res.status(401).json({ success:false, error:'Invalid credentials' });
    res.json({
      success: true,
      token: makeToken(user),
      user: { _id:user._id, username:user.username, email:user.email,
              role:user.role, isActive:user.isActive, settings:user.settings },
    });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ success:false, error:err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const u = req.user;
  res.json({ success:true, user:{
    _id:u._id, username:u.username, email:u.email,
    role:u.role, isActive:u.isActive, settings:u.settings, createdAt:u.createdAt,
  }});
});

module.exports = router;