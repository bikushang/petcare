const mongoose = require('mongoose');

/** A newsletter subscriber captured from the public blog page. */
const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, default: '', unique: true, sparse: true },
    source: { type: String, default: 'Blog newsletter' },
    consent: { type: Boolean, default: false },
    status: { type: String, enum: ['Subscribed', 'Unsubscribed'], default: 'Subscribed' },
    subscribedAt: { type: String, default: '' },
    unsubscribedAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Subscriber', SubscriberSchema);
