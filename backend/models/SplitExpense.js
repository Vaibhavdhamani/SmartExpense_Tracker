const mongoose = require('mongoose');

// Each participant in a split
const ParticipantSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  amount:    { type: Number, required: true, min: 0 },   // share amount
  isPaid:    { type: Boolean, default: false },           // have they paid back?
  paidAt:    { type: Date,   default: null },
  isCreator: { type: Boolean, default: false },           // the person who paid the bill
}, { _id: true });

const SplitExpenseSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  category:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  totalAmount:  { type: Number, required: true, min: 0 },
  date:         { type: Date,   default: Date.now },
  participants: { type: [ParticipantSchema], required: true },
  splitType:    {
    type: String,
    enum: ['equal', 'custom', 'percentage'],
    default: 'equal',
  },
  isSettled:    { type: Boolean, default: false },
  settledAt:    { type: Date,   default: null },
  notes:        { type: String, default: '' },
}, { timestamps: true });

SplitExpenseSchema.index({ user: 1, isSettled: 1 });
SplitExpenseSchema.index({ user: 1, date: -1 });

// Virtual: amount others owe you (excluding creator's share)
SplitExpenseSchema.virtual('amountOwed').get(function () {
  return this.participants
    .filter(p => !p.isCreator && !p.isPaid)
    .reduce((s, p) => s + p.amount, 0);
});

// Virtual: your own share (creator's portion)
SplitExpenseSchema.virtual('myShare').get(function () {
  const creator = this.participants.find(p => p.isCreator);
  return creator ? creator.amount : 0;
});

SplitExpenseSchema.set('toJSON',   { virtuals: true });
SplitExpenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SplitExpense', SplitExpenseSchema);