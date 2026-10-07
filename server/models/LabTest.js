const mongoose = require('mongoose');

const ResultParameterSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    value: { type: String, default: '' },
    unit: { type: String, default: '' },
    refRange: { type: String, default: '' },
    flag: {
      type: String,
      enum: ['Normal', 'Low', 'High', 'Critical', 'N/A'],
      default: 'Normal',
    },
  },
  { _id: false },
);

const SampleTrackingSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    stage: {
      type: String,
      enum: ['Collected', 'Received', 'In analysis', 'Completed', 'Rejected'],
      default: 'Collected',
    },
    timestamp: { type: String, default: '' },
    technician: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const LabTestSchema = new mongoose.Schema(
  {
    testNumber: { type: String, default: '', index: true },
    petId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    medRecordId: { type: String, default: '' },
    appointmentId: { type: String, default: '' },
    invoiceId: { type: String, default: '' },

    // Test details
    testType: {
      type: String,
      enum: ['Blood test', 'Urine test', 'Stool test', 'Imaging'],
      default: 'Blood test',
    },
    testCategory: {
      type: String,
      enum: ['CBC', 'Biochemistry', 'Urinalysis', 'Fecal', 'Culture', 'X-ray', 'Ultrasound', 'MRI', 'CT scan', 'Cytology', 'Histopathology', 'Other'],
      default: 'CBC',
    },
    testName: { type: String, default: '' },
    templateId: { type: String, default: '' },

    // Ordering
    requestedBy: { type: String, default: '' },
    dateOrdered: { type: String, default: '' },
    dateCompleted: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'STAT'],
      default: 'Routine',
    },
    status: {
      type: String,
      enum: ['Ordered', 'Sample collected', 'In analysis', 'Completed', 'Cancelled'],
      default: 'Ordered',
    },

    // Sample
    barcode: { type: String, default: '' },
    sampleType: { type: String, default: '' },
    sampleVolume: { type: String, default: '' },
    collectionMethod: { type: String, default: '' },
    collectedBy: { type: String, default: '' },
    collectionDate: { type: String, default: '' },
    storageCondition: { type: String, default: '' },
    sampleTracking: [SampleTrackingSchema],

    // Results
    results: [ResultParameterSchema],
    impression: { type: String, default: '' },
    findings: { type: String, default: '' },
    interpretation: { type: String, default: '' },
    notes: { type: String, default: '' },

    // Imaging-specific
    imagingRegion: { type: String, default: '' },
    imagingModality: { type: String, default: '' },
    contrastUsed: { type: Boolean, default: false },
    imageCount: { type: Number, default: 0 },
    images: [{
      id: { type: String, default: '' },
      name: { type: String, default: '' },
      url: { type: String, default: '' },
      description: { type: String, default: '' },
    }],

    // Report
    reportGenerated: { type: Boolean, default: false },
    reportGeneratedDate: { type: String, default: '' },
    digitallySigned: { type: Boolean, default: false },
    signedBy: { type: String, default: '' },
    signedDate: { type: String, default: '' },
    signedRole: { type: String, default: '' },

    // Billing
    cost: { type: Number, default: 0 },

    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('LabTest', LabTestSchema);
