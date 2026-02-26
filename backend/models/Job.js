const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  assigned_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduled_date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  supplies_used: [
    {
      name: String,
      quantity: Number,
    }
  ],
  photos: [String],
  completed_at: Date,
  service_report_url: String,
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);