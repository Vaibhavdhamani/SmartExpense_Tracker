const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: '📦' },
  color:       { type: String, default: '#6366f1' },
  amount:      { type: Number, required: true, min: 0 },
  currency:    { type: String, default: 'INR' },

  billingCycle: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'monthly',
  },

  category: {
    type: String,
    enum: ['streaming', 'music', 'software', 'gaming', 'fitness', 'news',
           'cloud', 'productivity', 'education', 'other'],
    default: 'other',
  },

  startDate:   { type: Date, required: true, default: Date.now },
  nextRenewal: { type: Date, required: true },
  reminderDays:{ type: Number, default: 3 },  // alert X days before renewal

  isActive:    { type: Boolean, default: true },
  isCancelled: { type: Boolean, default: false },
  cancelledAt: { type: Date,   default: null },

  website:     { type: String, default: '' },
  notes:       { type: String, default: '' },

  renewalHistory: [{
    date:   { type: Date },
    amount: { type: Number },
  }],

}, { timestamps: true });

SubscriptionSchema.index({ user: 1, isActive: 1 });
SubscriptionSchema.index({ user: 1, nextRenewal: 1 });

// Virtual: days until next renewal
SubscriptionSchema.virtual('daysUntilRenewal').get(function () {
  if (!this.nextRenewal) return null;
  return Math.ceil((new Date(this.nextRenewal) - new Date()) / 86400000);
});

// Virtual: is due for renewal alert
SubscriptionSchema.virtual('isDue').get(function () {
  const d = this.daysUntilRenewal;
  return d !== null && d <= this.reminderDays && d >= 0;
});

// Virtual: monthly equivalent cost
SubscriptionSchema.virtual('monthlyEquivalent').get(function () {
  const map = { weekly: 4.33, monthly: 1, quarterly: 1/3, 'half-yearly': 1/6, yearly: 1/12 };
  return Math.round(this.amount * (map[this.billingCycle] || 1) * 100) / 100;
});

// Static: compute next renewal from a given date + billing cycle
SubscriptionSchema.statics.computeNextRenewal = function (fromDate, billingCycle) {
  const d = new Date(fromDate);
  switch (billingCycle) {
    case 'weekly':      d.setDate(d.getDate() + 7);   break;
    case 'monthly':     d.setMonth(d.getMonth() + 1);  break;
    case 'quarterly':   d.setMonth(d.getMonth() + 3);  break;
    case 'half-yearly': d.setMonth(d.getMonth() + 6);  break;
    case 'yearly':      d.setFullYear(d.getFullYear() + 1); break;
    default:            d.setMonth(d.getMonth() + 1);
  }
  return d;
};

SubscriptionSchema.set('toJSON',   { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);