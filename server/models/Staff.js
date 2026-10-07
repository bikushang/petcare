const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  checkIn: { type: String, default: '' },
  checkOut: { type: String, default: '' },
  status: { type: String, enum: ['Present', 'Late', 'Absent', 'Half-day', 'Remote', 'On leave'], default: 'Present' },
  hoursWorked: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { _id: false });

const LeaveRequestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Bereavement', 'Unpaid', 'Compensatory'], default: 'Annual' },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  days: { type: Number, default: 1 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
  reason: { type: String, default: '' },
  appliedDate: { type: String, default: '' },
  reviewedBy: { type: String, default: '' },
  reviewedDate: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: false });

const PayrollRecordSchema = new mongoose.Schema({
  id: { type: String, required: true },
  period: { type: String, required: true },
  payDate: { type: String, default: '' },
  baseSalary: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  bonuses: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String, default: 'Transfer' },
  reference: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { _id: false });

const PerformanceReviewSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  period: { type: String, default: '' },
  reviewer: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  categories: [{
    name: { type: String, default: '' },
    score: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  }],
  strengths: { type: String, default: '' },
  improvements: { type: String, default: '' },
  goals: { type: String, default: '' },
  overallRating: { type: String, enum: ['Excellent', 'Good', 'Satisfactory', 'Needs improvement', 'Poor'], default: 'Satisfactory' },
  status: { type: String, enum: ['Pending', 'Completed', 'Acknowledged'], default: 'Pending' },
}, { _id: false });

const StaffDocumentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Contract', 'Certification', 'License', 'ID', 'Insurance', 'Training', 'NDA', 'Other'], default: 'Other' },
  uploadedDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Expired', 'Pending renewal'], default: 'Active' },
  notes: { type: String, default: '' },
}, { _id: false });

const BonusSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['Performance', 'Annual', 'Spot', 'Referral', 'Retention', 'Holiday', 'Other'], default: 'Performance' },
  amount: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  approvedBy: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Paid', 'Cancelled'], default: 'Pending' },
}, { _id: false });

const ActivityLogSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, default: '' },
  action: { type: String, required: true },
  module: { type: String, default: '' },
  description: { type: String, default: '' },
  reference: { type: String, default: '' },
}, { _id: false });

const ShiftScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  breakMin: { type: Number, default: 30 },
  isRecurring: { type: Boolean, default: true },
}, { _id: false });

const StaffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: {
      type: String,
      enum: [
        'Super Admin',
        'Clinic Owner',
        'Branch Manager',
        'Veterinarian',
        'Receptionist',
        'Veterinary Nurse',
        'Laboratory Technician',
        'Pharmacist',
        'Groomer',
        'Boarding Staff',
        'Accountant',
        'Inventory Manager',
        'Pet Owner',
      ],
      default: 'Receptionist',
    },
    branch: { type: String, default: '' },
    branchAccess: { type: [String], default: [] },
    phone: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'On leave', 'Inactive', 'Suspended'],
      default: 'Active',
    },
    shift: { type: String, default: '' },
    // HR fields
    hireDate: { type: String, default: '' },
    department: { type: String, default: '' },
    employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Volunteer'], default: 'Full-time' },
    baseSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    bankAccount: { type: String, default: '' },
    emergencyContactName: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, enum: ['', 'Male', 'Female', 'Other'], default: '' },
    nationalId: { type: String, default: '' },
    leaveBalance: {
      annual: { type: Number, default: 0 },
      sick: { type: Number, default: 0 },
      personal: { type: Number, default: 0 },
    },
    shiftSchedule: { type: [ShiftScheduleSchema], default: [] },
    attendance: { type: [AttendanceSchema], default: [] },
    leaveRequests: { type: [LeaveRequestSchema], default: [] },
    payroll: { type: [PayrollRecordSchema], default: [] },
    performanceReviews: { type: [PerformanceReviewSchema], default: [] },
    documents: { type: [StaffDocumentSchema], default: [] },
    bonuses: { type: [BonusSchema], default: [] },
    activityLog: { type: [ActivityLogSchema], default: [] },
    resetToken: { type: String, default: '' },
    resetTokenExpiry: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

StaffSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Staff', StaffSchema);
