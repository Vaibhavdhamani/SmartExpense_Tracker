const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: '🎯' },
  color:       { type: String, default: '#6366f1' },
  targetAmount:{ type: Number, required: true, min: 1 },
  savedAmount: { type: Number, default: 0, min: 0 },  // manually tracked savings
  targetDate:  { type: Date,   default: null },        // optional deadline
  category:    {
    type: String,
    enum: ['emergency','vacation','gadget','vehicle','home','education','wedding','health','other'],
    default: 'other'
  },
  isCompleted: { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  completedAt: { type: Date,   default: null },
}, { timestamps: true });

GoalSchema.index({ user: 1, isActive: 1 });

// Virtual: progress percentage
GoalSchema.virtual('progressPct').get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(Math.round((this.savedAmount / this.targetAmount) * 100), 100);
});

// Virtual: remaining amount
GoalSchema.virtual('remaining').get(function () {
  return Math.max(this.targetAmount - this.savedAmount, 0);
});

// Virtual: days left to target date
GoalSchema.virtual('daysLeft').get(function () {
  if (!this.targetDate) return null;
  return Math.ceil((new Date(this.targetDate) - new Date()) / 86400000);
});

GoalSchema.set('toJSON',   { virtuals: true });
GoalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', GoalSchema);