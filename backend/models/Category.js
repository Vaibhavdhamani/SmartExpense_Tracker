const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true },
  icon:         { type: String, default: '📝' },
  color:        { type: String, default: '#64748b' },
  descriptions: [{ type: String }],
  isDefault:    { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
