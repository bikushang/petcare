const mongoose = require('mongoose');

const StaffAssignmentSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['Surgeon', 'Anesthetist', 'Surgical Nurse', 'Assistant', 'Recovery Nurse'],
      default: 'Assistant',
    },
    staffId: { type: String, default: '' },
    staffName: { type: String, default: '' },
  },
  { _id: false },
);

const EquipmentItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Surgical instrument', 'Anesthesia equipment', 'Monitoring device', 'Consumable', 'Imaging'],
      default: 'Surgical instrument',
    },
    required: { type: Boolean, default: true },
    checked: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const AnesthesiaVitalSchema = new mongoose.Schema(
  {
    time: { type: String, default: '' },
    heartRate: { type: Number, default: 0 },
    respiratoryRate: { type: Number, default: 0 },
    temperatureC: { type: Number, default: 0 },
    bloodPressureSys: { type: Number, default: 0 },
    bloodPressureDia: { type: Number, default: 0 },
    oxygenLevel: { type: Number, default: 0 },
    etCO2: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const RecoveryVitalSchema = new mongoose.Schema(
  {
    time: { type: String, default: '' },
    temperatureC: { type: Number, default: 0 },
    heartRate: { type: Number, default: 0 },
    respiratoryRate: { type: Number, default: 0 },
    painScore: { type: Number, default: 0 },
    consciousness: {
      type: String,
      enum: ['Awake', 'Drowsy', 'Stuporous', 'Unconscious'],
      default: 'Unconscious',
    },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const SurgerySchema = new mongoose.Schema(
  {
    surgeryNumber: { type: String, default: '', index: true },
    petId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    appointmentId: { type: String, default: '' },
    medRecordId: { type: String, default: '' },
    prescriptionIds: [{ type: String, default: '' }],
    invoiceId: { type: String, default: '' },

    // Booking
    procedureName: { type: String, default: '' },
    procedureType: { type: String, enum: ['Planned', 'Emergency'], default: 'Planned' },
    category: {
      type: String,
      enum: ['Soft tissue', 'Orthopedic', 'Dental', 'Ophthalmic', 'Neurologic', 'Abdominal', 'Other'],
      default: 'Soft tissue',
    },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    estimatedDurationMin: { type: Number, default: 60 },
    actualDurationMin: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Scheduled', 'Pre-op', 'In surgery', 'Recovery', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },

    // Theater allocation
    theater: { type: String, default: '' },

    // Staff assignments
    staff: [StaffAssignmentSchema],

    // Equipment checklist
    equipmentChecklist: [EquipmentItemSchema],

    // Consent
    consentSigned: { type: Boolean, default: false },
    consentSignedBy: { type: String, default: '' },
    consentDate: { type: String, default: '' },
    consentNotes: { type: String, default: '' },

    // Pre-operative
    preOpNotes: { type: String, default: '' },
    preOpVitals: {
      weightKg: { type: Number, default: 0 },
      temperatureC: { type: Number, default: 0 },
      heartRate: { type: Number, default: 0 },
      respiratoryRate: { type: Number, default: 0 },
      bloodPressureSys: { type: Number, default: 0 },
      bloodPressureDia: { type: Number, default: 0 },
      oxygenLevel: { type: Number, default: 0 },
    },
    preOpDiagnosis: { type: String, default: '' },
    preOpBloodwork: { type: String, default: '' },
    fastingHours: { type: Number, default: 8 },

    // Surgery notes
    surgeryNotes: { type: String, default: '' },
    findings: { type: String, default: '' },
    complications: { type: String, default: '' },
    outcome: {
      type: String,
      enum: ['Successful', 'Successful with complications', 'Unsuccessful', 'Pending'],
      default: 'Pending',
    },

    // Anesthesia record
    anestheticProtocol: { type: String, default: '' },
    premedication: { type: String, default: '' },
    inductionAgent: { type: String, default: '' },
    inductionDose: { type: String, default: '' },
    maintenanceAgent: { type: String, default: '' },
    maintenanceDose: { type: String, default: '' },
    analgesia: { type: String, default: '' },
    fluidTherapy: { type: String, default: '' },
    anesthesiaVitals: [AnesthesiaVitalSchema],

    // Recovery monitoring
    recoveryVitals: [RecoveryVitalSchema],
    recoveryNotes: { type: String, default: '' },
    painManagement: { type: String, default: '' },

    // Discharge
    dischargeDate: { type: String, default: '' },
    dischargeSummary: { type: String, default: '' },
    homeCareInstructions: { type: String, default: '' },
    followUpDate: { type: String, default: '' },
    followUpNotes: { type: String, default: '' },

    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Surgery', SurgerySchema);
