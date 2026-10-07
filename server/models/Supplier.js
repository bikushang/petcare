const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    category: { type: String, default: '' },
    paymentTerms: { type: String, default: '' },
    leadTimeDays: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Supplier', SupplierSchema);
