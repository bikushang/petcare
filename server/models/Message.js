const mongoose = require('mongoose');

/**
 * An enquiry submitted from the public website (contact form, FAQ
 * "ask a question", or an appointment-request note). Reception works
 * this queue from the admin side.
 */
const MessageSchema = new mongoose.Schema(
  {
    reference: { type: String, default: '', unique: true, sparse: true },
    source: { type: String, enum: ['Contact form', 'FAQ question', 'Booking request', 'Other'], default: 'Contact form' },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    petName: { type: String, default: '' },
    topic: { type: String, default: '' },
    branch: { type: String, default: '' },
    message: { type: String, default: '' },
    attachments: [{ name: { type: String, default: '' }, size: { type: Number, default: 0 } }],
    consent: { type: Boolean, default: false },
    status: { type: String, enum: ['New', 'In progress', 'Answered', 'Closed'], default: 'New' },
    assignedTo: { type: String, default: '' },
    response: { type: String, default: '' },
    receivedAt: { type: String, default: '' },
    respondedAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Message', MessageSchema);
