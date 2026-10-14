const mongoose = require('mongoose');

/**
 * A review submitted through the public website. Held unpublished until
 * a staff member approves it, then rendered on /site/reviews.
 */
const SiteReviewSchema = new mongoose.Schema(
  {
    reference: { type: String, default: '', unique: true, sparse: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    petName: { type: String, default: '' },
    service: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    text: { type: String, default: '' },
    photos: [{ name: { type: String, default: '' } }],
    consentToPublish: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Published', 'Rejected'], default: 'Pending' },
    moderatedBy: { type: String, default: '' },
    reply: { type: String, default: '' },
    submittedAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SiteReview', SiteReviewSchema);
