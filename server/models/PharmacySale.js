const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    stockItemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false },
);

const PharmacySaleSchema = new mongoose.Schema(
  {
    saleNumber: { type: String, default: '', index: true },
    date: { type: String, default: '' },
    customerName: { type: String, default: '' },
    petName: { type: String, default: '' },
    ownerId: { type: String, default: '' },
    items: [SaleItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Transfer', 'Insurance', ''],
      default: '',
    },
    status: {
      type: String,
      enum: ['Completed', 'Refunded', 'Pending'],
      default: 'Completed',
    },
    dispensedBy: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PharmacySale', PharmacySaleSchema);
