const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  category:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount:    { type: Number, required: true, min: 0 },
  period:    { type: String, enum: ['daily','weekly','monthly','yearly'], default: 'monthly' },
  startDate: { type: Date, default: Date.now },
  isActive:  { type: Boolean, default: true }
}, { timestamps: true });

BudgetSchema.index({ user: 1, category: 1, isActive: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);
