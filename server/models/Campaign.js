const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    channel: { type: String, enum: ['Email', 'SMS', 'WhatsApp', 'Push', 'Mixed'], default: 'Email' },
    status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Paused', 'Completed'], default: 'Draft' },
    targetSegment: { type: String, default: '' },
    segmentId: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Campaign', CampaignSchema);
