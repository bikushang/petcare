const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: '' },
    branch: { type: String, default: '' },
    address: { type: String, default: '' },
    manager: { type: String, default: '' },
    phone: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive', 'Full'], default: 'Active' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Warehouse', WarehouseSchema);
