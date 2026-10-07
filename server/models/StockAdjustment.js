const mongoose = require('mongoose');

const StockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: { type: String, default: '' },
    date: { type: String, default: '' },
    itemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    warehouseId: { type: String, default: '' },
    warehouseName: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Stock in', 'Stock out', 'Damaged', 'Lost', 'Return to supplier', 'Return from customer', 'Correction', 'Recount'],
      default: 'Correction',
    },
    quantity: { type: Number, default: 0 },
    previousStock: { type: Number, default: 0 },
    newStock: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    performedBy: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('StockAdjustment', StockAdjustmentSchema);
