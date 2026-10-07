const mongoose = require('mongoose');

const InventoryCategory = {
  type: String,
  enum: ['Medicines', 'Surgical equipment', 'Pet food', 'Accessories', 'Cleaning supplies', 'Laboratory equipment'],
  default: 'Medicines',
};

const InventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: InventoryCategory,
    sku: { type: String, default: '' },
    barcode: { type: String, default: '' },
    unit: { type: String, default: '' },
    reorderLevel: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    warehouseId: { type: String, default: '' },
    warehouseName: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    supplier: { type: String, default: '' },
    supplierId: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
