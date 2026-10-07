const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    id: String, name: String, type: String, url: String, date: String,
  },
  { _id: false },
);

const MedRecordSchema = new mongoose.Schema(
  {
    petId: { type: String, required: true, index: true },
    date: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Consultation', 'Vaccination', 'Surgery', 'Lab', 'Prescription', 'Imaging'],
      default: 'Consultation',
    },
    title: { type: String, default: '' },
    vet: { type: String, default: '' },
    findings: { type: String, default: '' },
    treatment: { type: String, default: '' },
    chiefComplaint: { type: String, default: '' },
    medicalHistory: { type: String, default: '' },
    physicalExamination: { type: String, default: '' },
    vitalSigns: {
      weightKg: { type: Number, default: 0 },
      temperatureC: { type: Number, default: 0 },
      heartRate: { type: Number, default: 0 },
      respiratoryRate: { type: Number, default: 0 },
      bloodPressureSys: { type: Number, default: 0 },
      bloodPressureDia: { type: Number, default: 0 },
      oxygenLevel: { type: Number, default: 0 },
    },
    diagnosis: { type: String, default: '' },
    treatmentPlan: { type: String, default: '' },
    soapNotes: {
      subjective: { type: String, default: '' },
      objective: { type: String, default: '' },
      assessment: { type: String, default: '' },
      plan: { type: String, default: '' },
    },
    attachments: [AttachmentSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model('MedRecord', MedRecordSchema);
