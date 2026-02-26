const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact_info: { type: String },
  subscription_tier: { type: String, default: 'basic' },
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);