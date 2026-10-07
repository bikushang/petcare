const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    petId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    vet: { type: String, default: '' },
    service: { type: String, default: '' },
    date: { type: String, default: '', index: true },
    time: { type: String, default: '' },
    durationMin: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['Scheduled', 'Checked-in', 'In consultation', 'Completed', 'Cancelled', 'Rescheduled', 'No-show'],
      default: 'Scheduled',
    },
    room: { type: String, default: '' },
    reason: { type: String, default: '' },
    bookingType: { type: String, enum: ['Online', 'Walk-in', 'Emergency'], default: 'Online' },
    tokenNumber: { type: Number, default: 0 },
    queuePosition: { type: Number, default: 0 },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: { type: String, enum: ['None', 'Weekly', 'Bi-weekly', 'Monthly'], default: 'None' },
    followUpDate: { type: String, default: '' },
    followUpReminder: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
