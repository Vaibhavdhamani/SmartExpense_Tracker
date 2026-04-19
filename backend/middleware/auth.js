const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── protect — any logged-in user ──────────────────────────────
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized — no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account deactivated' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalid or expired' });
  }
};

// ── adminOnly — must be role:admin ────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied — Admins only' });
  }
  next();
};