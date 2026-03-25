const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount:      { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  notes:       { type: String, default: '' },
  date:        { type: Date,   required: true, default: Date.now }
}, { timestamps: true });

// Index for fast user+date queries
ExpenseSchema.index({ user: 1, date: -1 });
ExpenseSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
