const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },

  // ── Admin role ─────────────────────────────────────────────
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },  // admin can deactivate users

  settings: {
    currency:           { type: String,  default: 'INR' },
    dateFormat:         { type: String,  default: 'DD/MM/YYYY' },
    emailNotifications: { type: Boolean, default: true },
    budgetAlerts:       { type: Boolean, default: true },
    weeklyReports:      { type: Boolean, default: false },
    monthlySalary:      { type: Number,  default: 0 },
  },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Virtual: isAdmin helper
UserSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

module.exports = mongoose.model('User', UserSchema);