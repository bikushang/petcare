const mongoose = require('mongoose');

const FeedingScheduleSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    time: { type: String, default: '' },
    food: { type: String, default: '' },
    amount: { type: String, default: '' },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const MedicationScheduleSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    time: { type: String, default: '' },
    medication: { type: String, default: '' },
    dose: { type: String, default: '' },
    route: { type: String, default: '' },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const WalkingScheduleSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    time: { type: String, default: '' },
    durationMin: { type: Number, default: 0 },
    handler: { type: String, default: '' },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const HealthCheckSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    temperatureC: { type: Number, default: 0 },
    heartRate: { type: Number, default: 0 },
    respiratoryRate: { type: Number, default: 0 },
    appetite: { type: String, enum: ['Normal', 'Reduced', 'None', ''], default: '' },
    demeanor: { type: String, enum: ['Normal', 'Quiet', 'Lethargic', 'Anxious', 'Aggressive', ''], default: '' },
    notes: { type: String, default: '' },
    checkedBy: { type: String, default: '' },
  },
  { _id: false },
);

const DailyPhotoSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    date: { type: String, default: '' },
    url: { type: String, default: '' },
    caption: { type: String, default: '' },
  },
  { _id: false },
);

const CareNoteSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    note: { type: String, default: '' },
    staff: { type: String, default: '' },
  },
  { _id: false },
);

const BoardingSchema = new mongoose.Schema(
  {
    boardingNumber: { type: String, default: '' },
    petName: { type: String, required: true },
    owner: { type: String, default: '' },
    ownerId: { type: String, default: '' },
    petId: { type: String, default: '' },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    room: { type: String, default: '' },
    cage: { type: String, default: '' },
    checkIn: { type: String, default: '' },
    checkOut: { type: String, default: '' },
    actualCheckOut: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Reserved', 'Checked-in', 'Discharged', 'Cancelled'],
      default: 'Checked-in',
    },
    feedingNotes: { type: String, default: '' },
    feedingSchedule: [FeedingScheduleSchema],
    medicationSchedule: [MedicationScheduleSchema],
    walkingSchedule: [WalkingScheduleSchema],
    healthChecks: [HealthCheckSchema],
    dailyPhotos: [DailyPhotoSchema],
    careNotes: [CareNoteSchema],
    specialNeeds: { type: String, default: '' },
    dietaryRestrictions: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    vetOnCall: { type: String, default: '' },
    dailyRate: { type: Number, default: 0 },
    additionalServices: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Transfer', 'Insurance', ''], default: '' },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Refunded', ''], default: '' },
    dischargeNotes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Boarding', BoardingSchema);
