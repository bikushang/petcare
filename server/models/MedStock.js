const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    expiry: { type: String, default: '' },
    receivedDate: { type: String, default: '' },
    supplierId: { type: String, default: '' },
    costPerUnit: { type: Number, default: 0 },
  },
  { _id: false },
);

const MedStockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['Medicine', 'Vaccine', 'Supplement', 'Consumable', 'Equipment', 'Food'],
      default: 'Medicine',
    },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    reorderLevel: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    barcode: { type: String, default: '' },
    qrCode: { type: String, default: '' },

    // Medicine details
    genericName: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    supplier: { type: String, default: '' },
    supplierId: { type: String, default: '' },
    dosageForm: { type: String, default: '' },
    strength: { type: String, default: '' },
    dosageInfo: { type: String, default: '' },
    activeIngredients: { type: String, default: '' },
    storageCondition: { type: String, default: '' },
    prescriptionRequired: { type: Boolean, default: false },
    controlledDrug: { type: Boolean, default: false },

    // Batch tracking
    batches: [BatchSchema],
    batch: { type: String, default: '' },
    expiry: { type: String, default: '' },

    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MedStock', MedStockSchema);
