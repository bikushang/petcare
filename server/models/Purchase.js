const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    stockItemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    expiry: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    unitCost: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false },
);

const PurchaseSchema = new mongoose.Schema(
  {
    poNumber: { type: String, default: '', index: true },
    supplierId: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    date: { type: String, default: '' },
    receivedDate: { type: String, default: '' },
    items: [PurchaseItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'],
      default: 'Draft',
    },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Purchase', PurchaseSchema);
