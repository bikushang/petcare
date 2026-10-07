const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    id: String, name: String, type: String, date: String, url: String,
  },
  { _id: false },
);

const PetSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
    color: { type: String, default: '' },
    birthDate: { type: String, default: '' },
    weightKg: { type: Number, default: 0 },
    heightCm: { type: Number, default: 0 },
    bloodGroup: { type: String, default: '' },
    sterilized: { type: Boolean, default: false },
    allergies: { type: String, default: '' },
    conditions: { type: String, default: '' },
    dietType: { type: String, default: 'Standard' },
    microchipNumber: { type: String, default: '' },
    rfidNumber: { type: String, default: '' },
    qrCodeId: { type: String, default: '' },
    insuranceProvider: { type: String, default: '' },
    insurancePolicyNumber: { type: String, default: '' },
    insuranceExpiry: { type: String, default: '' },
    pedigreeInfo: { type: String, default: '' },
    weightHistory: [{ date: String, weightKg: Number }],
    photos: [{ id: String, url: String, caption: String, date: String }],
    documents: [DocumentSchema],
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Pet', PetSchema);
