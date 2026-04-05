const mongoose = require('mongoose');

const RecurringSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount:      { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  notes:       { type: String, default: '' },

  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },

  dayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
  dayOfWeek:  { type: Number, min: 0, max: 6,  default: 1 },

  isActive:    { type: Boolean, default: true  },
  startDate:   { type: Date,    default: Date.now },
  endDate:     { type: Date,    default: null },
  lastAddedAt: { type: Date,    default: null },
  nextDueAt:   { type: Date,    default: null },
  addCount:    { type: Number,  default: 0 },
}, { timestamps: true });

RecurringSchema.index({ user: 1, isActive: 1 });

// Compute next due date from a given base date
RecurringSchema.methods.computeNextDue = function (fromDate = new Date()) {
  const d = new Date(fromDate);

  if (this.frequency === 'daily') {
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (this.frequency === 'weekly') {
    const today     = d.getDay();
    const target    = this.dayOfWeek;
    const daysAhead = (target - today + 7) % 7 || 7;
    d.setDate(d.getDate() + daysAhead);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (this.frequency === 'monthly') {
    const next = new Date(d.getFullYear(), d.getMonth(), this.dayOfMonth);
    if (next <= d) next.setMonth(next.getMonth() + 1);
    return next;
  }

  if (this.frequency === 'yearly') {
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  return d;
};

module.exports = mongoose.model('Recurring', RecurringSchema);