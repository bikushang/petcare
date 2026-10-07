const mongoose = require('mongoose');

const GroomingProductSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    quantity: { type: String, default: '' },
  },
  { _id: false },
);

const GroomingPhotoSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    type: { type: String, enum: ['before', 'after'], default: 'before' },
    url: { type: String, default: '' },
    caption: { type: String, default: '' },
  },
  { _id: false },
);

const GroomingServiceItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
  },
  { _id: false },
);

const GroomingSchema = new mongoose.Schema(
  {
    appointmentNumber: { type: String, default: '' },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    ownerId: { type: String, default: '' },
    petId: { type: String, default: '' },
    groomer: { type: String, default: '' },
    date: { type: String, default: '', index: true },
    time: { type: String, default: '' },
    durationMin: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['Scheduled', 'Checked-in', 'In progress', 'Completed', 'Cancelled', 'No-show'],
      default: 'Scheduled',
    },
    services: [GroomingServiceItemSchema],
    packageId: { type: String, default: '' },
    packageName: { type: String, default: '' },
    notes: { type: String, default: '' },
    groomingNotes: { type: String, default: '' },
    productsUsed: [GroomingProductSchema],
    beforePhotos: [GroomingPhotoSchema],
    afterPhotos: [GroomingPhotoSchema],
    reminderSent: { type: Boolean, default: false },
    reminderDate: { type: String, default: '' },
    reminderMethod: { type: String, enum: ['SMS', 'Email', 'Phone', 'None'], default: 'None' },
    nextGroomingDate: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    customerFeedback: { type: String, default: '' },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Transfer', 'Insurance', ''], default: '' },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Refunded', ''], default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Grooming', GroomingSchema);
