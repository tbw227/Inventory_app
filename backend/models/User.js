const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  role: { type: String, enum: ['technician', 'admin'], required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);