const mongoose = require('mongoose');

const SupplySchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  quantity_on_hand: { type: Number, default: 0 },
  reorder_threshold: { type: Number, default: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Supply', SupplySchema);