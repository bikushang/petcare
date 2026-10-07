const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    id: String, date: String, type: String, title: String, read: Boolean,
  },
  { _id: false },
);

const OwnerSchema = new mongoose.Schema(
  {
    customerId: { type: String, default: '' },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    occupation: { type: String, default: '' },
    emergencyContacts: [{
      id: String, name: String, relationship: String, phone: String,
    }],
    familyMembers: [{
      id: String, name: String, relationship: String, phone: String,
    }],
    membershipPlan: { type: String, enum: ['None', 'Basic', 'Premium', 'VIP'], default: 'None' },
    membershipSince: { type: String, default: '' },
    loyaltyPoints: { type: Number, default: 0 },
    creditBalance: { type: Number, default: 0 },
    communicationLog: [{
      id: String, date: String, channel: String, direction: String, subject: String, notes: String,
    }],
    notifications: [NotificationSchema],
    feedback: [{
      id: String, date: String, rating: Number, comment: String, staff: String,
    }],
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Owner', OwnerSchema);
