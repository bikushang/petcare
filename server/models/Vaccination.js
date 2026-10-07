const mongoose = require('mongoose');

const VaccinationSchema = new mongoose.Schema(
  {
    petId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    vaccineName: { type: String, default: '' },
    scheduleType: {
      type: String,
      enum: ['Puppy', 'Kitten', 'Adult', 'Livestock', 'Custom'],
      default: 'Adult',
    },
    doseNumber: { type: Number, default: 1 },
    totalDoses: { type: Number, default: 1 },
    dateGiven: { type: String, default: '' },
    nextDueDate: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Overdue', 'Scheduled'],
      default: 'Pending',
    },
    vet: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    expiryDate: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    certificateId: { type: String, default: '' },
    notes: { type: String, default: '' },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Vaccination', VaccinationSchema);
