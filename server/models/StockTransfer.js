const mongoose = require('mongoose');

const TransferItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    itemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
  },
  { _id: false },
);

const StockTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, default: '' },
    date: { type: String, default: '' },
    fromWarehouseId: { type: String, default: '' },
    fromWarehouseName: { type: String, default: '' },
    toWarehouseId: { type: String, default: '' },
    toWarehouseName: { type: String, default: '' },
    items: [TransferItemSchema],
    status: {
      type: String,
      enum: ['Draft', 'In transit', 'Received', 'Cancelled'],
      default: 'Draft',
    },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('StockTransfer', StockTransferSchema);
