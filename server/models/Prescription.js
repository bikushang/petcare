const mongoose = require('mongoose');

const PrescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, default: '' },
    medicineId: { type: String, default: '' },
    dosage: { type: String, default: '' },
    dosageValue: { type: Number, default: 0 },
    dosageUnit: {
      type: String,
      enum: ['mg', 'ml', 'tablet', 'capsule', 'drop', 'mg/kg', 'ml/kg', 'IU', 'spray', 'patch'],
      default: 'mg',
    },
    frequency: {
      type: String,
      enum: ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every other day', 'Weekly', 'As needed', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours'],
      default: 'Once daily',
    },
    duration: { type: String, default: '' },
    durationValue: { type: Number, default: 0 },
    durationUnit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'ongoing'],
      default: 'days',
    },
    route: {
      type: String,
      enum: ['Oral', 'Topical', 'Injectable (SC)', 'Injectable (IM)', 'Injectable (IV)', 'Sublingual', 'Intranasal', 'Ophthalmic', 'Otic', 'Rectal', 'Inhalation'],
      default: 'Oral',
    },
    instructions: { type: String, default: '' },
    foodRestriction: {
      type: String,
      enum: ['None', 'With food', 'Before food', 'After food', 'Empty stomach', 'With water'],
      default: 'None',
    },
    foodRestrictionNotes: { type: String, default: '' },
    alternatives: [{ type: String, default: '' }],
    quantity: { type: Number, default: 0 },
    refillsRemaining: { type: Number, default: 0 },
    stockItemId: { type: String, default: '' },
  },
  { _id: false },
);

const PrescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: { type: String, default: '', index: true },
    petId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    medRecordId: { type: String, default: '' },
    vet: { type: String, default: '' },
    date: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Pending', 'Expired', 'Cancelled'],
      default: 'Pending',
    },
    items: [PrescriptionItemSchema],
    diagnosis: { type: String, default: '' },
    notes: { type: String, default: '' },
    isRepeat: { type: Boolean, default: false },
    repeatCount: { type: Number, default: 0 },
    maxRepeats: { type: Number, default: 0 },
    parentPrescriptionId: { type: String, default: '' },
    expiresAt: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    dispensed: { type: Boolean, default: false },
    dispensedDate: { type: String, default: '' },
    dispensedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Prescription', PrescriptionSchema);
