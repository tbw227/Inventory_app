const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  contact_info: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);