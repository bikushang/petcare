/**
 * Frontend API client — talks to the Node.js/Express/MongoDB backend.
 * All collections are fetched via GET /api/aggregate on load.
 * Mutations go through individual REST endpoints per collection.
 */

export const API_BASE =
  typeof window !== 'undefined'
    ? (window as unknown as { __API_BASE__?: string }).__API_BASE__ || process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
    : process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export type DB = {
  owners: Owner[];
  pets: Pet[];
  appointments: Appointment[];
  medRecords: MedRecord[];
  medStock: MedStock[];
  invoices: Invoice[];
  expenses: Expense[];
  staff: Staff[];
  boarding: BoardingPet[];
  grooming: GroomingAppt[];
  vaccinations: Vaccination[];
  prescriptions: Prescription[];
  surgeries: Surgery[];
  labTests: LabTest[];
  suppliers: Supplier[];
  purchases: Purchase[];
  pharmacySales: PharmacySale[];
  warehouses: Warehouse[];
  inventoryItems: InventoryItem[];
  stockTransfers: StockTransfer[];
  stockAdjustments: StockAdjustment[];
  campaigns: Campaign[];
  segments: Segment[];
  messages: SiteMessage[];
  siteReviews: SiteReview[];
  subscribers: Subscriber[];
};

export type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
};

export type CommunicationLog = {
  id: string;
  date: string;
  channel: 'Phone' | 'Email' | 'SMS' | 'In-person' | 'Portal';
  direction: 'Incoming' | 'Outgoing';
  subject: string;
  notes: string;
};

export type NotificationItem = {
  id: string;
  date: string;
  type: 'Appointment' | 'Invoice' | 'Vaccine' | 'System' | 'Promotion';
  title: string;
  read: boolean;
};

export type FeedbackRecord = {
  id: string;
  date: string;
  rating: number;
  comment: string;
  staff: string;
};

export type Owner = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  occupation: string;
  emergencyContacts: EmergencyContact[];
  familyMembers: FamilyMember[];
  membershipPlan: 'None' | 'Basic' | 'Premium' | 'VIP';
  membershipSince: string;
  loyaltyPoints: number;
  creditBalance: number;
  communicationLog: CommunicationLog[];
  notifications: NotificationItem[];
  feedback: FeedbackRecord[];
  notes?: string;
  createdAt: string;
};

export type WeightEntry = {
  date: string;
  weightKg: number;
};

export type PetPhoto = {
  id: string;
  url: string;
  caption: string;
  date: string;
};

export type PetDocument = {
  id: string;
  name: string;
  type: string;
  date: string;
  url: string;
};

export type Pet = {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  gender: 'Male' | 'Female' | 'Unknown';
  color: string;
  birthDate: string;
  weightKg: number;
  heightCm: number;
  bloodGroup: string;
  sterilized: boolean;
  allergies: string;
  conditions: string;
  dietType: string;
  microchipNumber: string;
  rfidNumber: string;
  qrCodeId: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  pedigreeInfo: string;
  weightHistory: WeightEntry[];
  photos: PetPhoto[];
  documents: PetDocument[];
  notes?: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  petId: string;
  ownerId: string;
  vet: string;
  service: string;
  date: string;
  time: string;
  durationMin: number;
  status: 'Scheduled' | 'Checked-in' | 'In consultation' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-show';
  room?: string;
  reason: string;
  bookingType: 'Online' | 'Walk-in' | 'Emergency';
  tokenNumber: number;
  queuePosition: number;
  isRecurring: boolean;
  recurrencePattern: 'None' | 'Weekly' | 'Bi-weekly' | 'Monthly';
  followUpDate: string;
  followUpReminder: boolean;
  notes: string;
};

export type VitalSigns = {
  weightKg: number;
  temperatureC: number;
  heartRate: number;
  respiratoryRate: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  oxygenLevel: number;
};

export type EMRAttachment = {
  id: string;
  name: string;
  type: 'Image' | 'PDF' | 'Audio' | 'Video';
  url: string;
  date: string;
};

export type SOAPNotes = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type MedRecord = {
  id: string;
  petId: string;
  date: string;
  type: 'Consultation' | 'Vaccination' | 'Surgery' | 'Lab' | 'Prescription' | 'Imaging';
  title: string;
  vet: string;
  findings: string;
  treatment: string;
  chiefComplaint: string;
  medicalHistory: string;
  physicalExamination: string;
  vitalSigns: VitalSigns;
  diagnosis: string;
  treatmentPlan: string;
  soapNotes: SOAPNotes;
  attachments: EMRAttachment[];
};

export type Batch = {
  id: string;
  batchNumber: string;
  quantity: number;
  expiry: string;
  receivedDate: string;
  supplierId: string;
  costPerUnit: number;
};

export type MedStock = {
  id: string;
  name: string;
  category: 'Medicine' | 'Vaccine' | 'Supplement' | 'Consumable' | 'Equipment' | 'Food';
  stock: number;
  unit: string;
  reorderLevel: number;
  reorderQty: number;
  price: number;
  barcode: string;
  qrCode: string;
  genericName: string;
  manufacturer: string;
  supplier: string;
  supplierId: string;
  dosageForm: string;
  strength: string;
  dosageInfo: string;
  activeIngredients: string;
  storageCondition: string;
  prescriptionRequired: boolean;
  controlledDrug: boolean;
  batches: Batch[];
  batch: string;
  expiry: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  paymentTerms: string;
  leadTimeDays: number;
  notes: string;
  createdAt: string;
};

export type PurchaseItem = {
  id: string;
  stockItemId: string;
  itemName: string;
  batchNumber: string;
  expiry: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineTotal: number;
};

export type Purchase = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  receivedDate: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'Draft' | 'Ordered' | 'Partially received' | 'Received' | 'Cancelled';
  notes: string;
  createdAt: string;
};

export type SaleItem = {
  id: string;
  stockItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type PharmacySale = {
  id: string;
  saleNumber: string;
  date: string;
  customerName: string;
  petName: string;
  ownerId: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Insurance' | '';
  status: 'Completed' | 'Refunded' | 'Pending';
  dispensedBy: string;
  notes: string;
  createdAt: string;
};

export type Warehouse = {
  id: string;
  name: string;
  code: string;
  branch: string;
  address: string;
  manager: string;
  phone: string;
  capacity: number;
  status: 'Active' | 'Inactive' | 'Full';
  notes: string;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: 'Medicines' | 'Surgical equipment' | 'Pet food' | 'Accessories' | 'Cleaning supplies' | 'Laboratory equipment';
  sku: string;
  barcode: string;
  unit: string;
  reorderLevel: number;
  reorderQty: number;
  unitCost: number;
  unitPrice: number;
  warehouseId: string;
  warehouseName: string;
  stock: number;
  reserved: number;
  damaged: number;
  supplier: string;
  supplierId: string;
  notes: string;
  createdAt: string;
};

export type TransferItem = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
};

export type StockTransfer = {
  id: string;
  transferNumber: string;
  date: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  items: TransferItem[];
  status: 'Draft' | 'In transit' | 'Received' | 'Cancelled';
  notes: string;
  createdAt: string;
};

export type StockAdjustment = {
  id: string;
  adjustmentNumber: string;
  date: string;
  itemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  type: 'Stock in' | 'Stock out' | 'Damaged' | 'Lost' | 'Return to supplier' | 'Return from customer' | 'Correction' | 'Recount';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  createdAt: string;
};

export type InvoiceItem = {
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  taxable: boolean;
  category: 'Consultation' | 'Surgery' | 'Medication' | 'Lab' | 'Vaccination' | 'Grooming' | 'Boarding' | 'Product' | 'Other';
  reference: string;
  referenceId: string;
  cost: number;
  notes: string;
  serviceDate: string;
  practitionerId: string;
  practitionerName: string;
};

export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Card' | 'Transfer' | 'Insurance' | 'Credit' | 'Coupon' | '';
  reference: string;
  notes: string;
  receivedBy: string;
};

export type TaxLine = {
  name: string;
  rate: number;
  amount: number;
};

export type CouponLine = {
  code: string;
  type: 'Percent' | 'Fixed' | '';
  value: number;
  amount: number;
};

export type Invoice = {
  id: string;
  number: string;
  docType: 'Invoice' | 'Estimate' | 'Receipt' | 'Credit Note' | 'Refund';
  ownerId: string;
  petId: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: 'Fixed' | 'Percent' | '';
  coupon: CouponLine[];
  taxes: TaxLine[];
  taxTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Refunded' | 'Cancelled' | 'Converted';
  method: 'Cash' | 'Card' | 'Transfer' | 'Insurance' | 'Credit' | 'Coupon' | '';
  payments: Payment[];
  notes: string;
  terms: string;
  linkedInvoiceId: string;
  linkedEstimateId: string;
  createdBy: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  number: string;
  date: string;
  category: 'Rent' | 'Utilities' | 'Salaries' | 'Supplies' | 'Equipment' | 'Maintenance' | 'Marketing' | 'Insurance' | 'Professional fees' | 'Travel' | 'Bank charges' | 'Taxes' | 'Other';
  description: string;
  vendor: string;
  vendorId: string;
  amount: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Cheque' | '';
  status: 'Paid' | 'Pending' | 'Scheduled';
  recurring: boolean;
  recurrencePattern: 'None' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  receiptNumber: string;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type ShiftScheduleEntry = {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  breakMin: number;
  isRecurring: boolean;
};

export type AttendanceRecord = {
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Late' | 'Absent' | 'Half-day' | 'Remote' | 'On leave';
  hoursWorked: number;
  notes: string;
};

export type LeaveRequest = {
  id: string;
  type: 'Annual' | 'Sick' | 'Personal' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Unpaid' | 'Compensatory';
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string;
  appliedDate: string;
  reviewedBy: string;
  reviewedDate: string;
  notes: string;
};

export type PayrollRecord = {
  id: string;
  period: string;
  payDate: string;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: 'Draft' | 'Pending' | 'Paid' | 'Cancelled';
  paymentMethod: string;
  reference: string;
  notes: string;
};

export type PerformanceReview = {
  id: string;
  date: string;
  period: string;
  reviewer: string;
  rating: number;
  categories: { name: string; score: number; notes: string }[];
  strengths: string;
  improvements: string;
  goals: string;
  overallRating: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs improvement' | 'Poor';
  status: 'Pending' | 'Completed' | 'Acknowledged';
};

export type StaffDocument = {
  id: string;
  name: string;
  type: 'Contract' | 'Certification' | 'License' | 'ID' | 'Insurance' | 'Training' | 'NDA' | 'Other';
  uploadedDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Pending renewal';
  notes: string;
};

export type BonusRecord = {
  id: string;
  date: string;
  type: 'Performance' | 'Annual' | 'Spot' | 'Referral' | 'Retention' | 'Holiday' | 'Other';
  amount: number;
  reason: string;
  approvedBy: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Cancelled';
};

export type StaffActivityLog = {
  id: string;
  date: string;
  time: string;
  action: string;
  module: string;
  description: string;
  reference: string;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  branch: string;
  branchAccess: string[];
  phone: string;
  email: string;
  status: 'Active' | 'On leave' | 'Inactive' | 'Suspended';
  shift: string;
  hireDate: string;
  department: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern' | 'Volunteer';
  baseSalary: number;
  allowances: number;
  bankAccount: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  dateOfBirth: string;
  gender: '' | 'Male' | 'Female' | 'Other';
  nationalId: string;
  leaveBalance: { annual: number; sick: number; personal: number };
  shiftSchedule: ShiftScheduleEntry[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  payroll: PayrollRecord[];
  performanceReviews: PerformanceReview[];
  documents: StaffDocument[];
  bonuses: BonusRecord[];
  activityLog: StaffActivityLog[];
};

export type FeedingScheduleItem = {
  id: string;
  time: string;
  food: string;
  amount: string;
  done: boolean;
};

export type MedicationScheduleItem = {
  id: string;
  time: string;
  medication: string;
  dose: string;
  route: string;
  done: boolean;
};

export type WalkingScheduleItem = {
  id: string;
  time: string;
  durationMin: number;
  handler: string;
  done: boolean;
};

export type HealthCheck = {
  id: string;
  date: string;
  time: string;
  temperatureC: number;
  heartRate: number;
  respiratoryRate: number;
  appetite: 'Normal' | 'Reduced' | 'None' | '';
  demeanor: 'Normal' | 'Quiet' | 'Lethargic' | 'Anxious' | 'Aggressive' | '';
  notes: string;
  checkedBy: string;
};

export type DailyPhoto = {
  id: string;
  date: string;
  url: string;
  caption: string;
};

export type CareNote = {
  id: string;
  date: string;
  time: string;
  note: string;
  staff: string;
};

export type BoardingPet = {
  id: string;
  boardingNumber: string;
  petName: string;
  owner: string;
  ownerId: string;
  petId: string;
  species: string;
  breed: string;
  room: string;
  cage: string;
  checkIn: string;
  checkOut: string;
  actualCheckOut: string;
  status: 'Reserved' | 'Checked-in' | 'Discharged' | 'Cancelled';
  feedingNotes: string;
  feedingSchedule: FeedingScheduleItem[];
  medicationSchedule: MedicationScheduleItem[];
  walkingSchedule: WalkingScheduleItem[];
  healthChecks: HealthCheck[];
  dailyPhotos: DailyPhoto[];
  careNotes: CareNote[];
  specialNeeds: string;
  dietaryRestrictions: string;
  emergencyContact: string;
  vetOnCall: string;
  dailyRate: number;
  additionalServices: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Insurance' | '';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | '';
  dischargeNotes: string;
  createdAt: string;
};

export type GroomingServiceItem = {
  id: string;
  name: string;
  price: number;
};

export type GroomingProduct = {
  id: string;
  name: string;
  quantity: string;
};

export type GroomingPhoto = {
  id: string;
  type: 'before' | 'after';
  url: string;
  caption: string;
};

export type GroomingAppt = {
  id: string;
  appointmentNumber: string;
  petName: string;
  owner: string;
  ownerId: string;
  petId: string;
  groomer: string;
  date: string;
  time: string;
  durationMin: number;
  status: 'Scheduled' | 'Checked-in' | 'In progress' | 'Completed' | 'Cancelled' | 'No-show';
  services: GroomingServiceItem[];
  packageId: string;
  packageName: string;
  notes: string;
  groomingNotes: string;
  productsUsed: GroomingProduct[];
  beforePhotos: GroomingPhoto[];
  afterPhotos: GroomingPhoto[];
  reminderSent: boolean;
  reminderDate: string;
  reminderMethod: 'SMS' | 'Email' | 'Phone' | 'None';
  nextGroomingDate: string;
  rating: number;
  customerFeedback: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Insurance' | '';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | '';
  createdAt: string;
};

export type Vaccination = {
  id: string;
  petId: string;
  ownerId: string;
  vaccineName: string;
  scheduleType: 'Puppy' | 'Kitten' | 'Adult' | 'Livestock' | 'Custom';
  doseNumber: number;
  totalDoses: number;
  dateGiven: string;
  nextDueDate: string;
  status: 'Completed' | 'Pending' | 'Overdue' | 'Scheduled';
  vet: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  verified: boolean;
  certificateId: string;
  notes: string;
  reminderSent: boolean;
};

export type PrescriptionItem = {
  medicineName: string;
  medicineId: string;
  dosage: string;
  dosageValue: number;
  dosageUnit: 'mg' | 'ml' | 'tablet' | 'capsule' | 'drop' | 'mg/kg' | 'ml/kg' | 'IU' | 'spray' | 'patch';
  frequency: 'Once daily' | 'Twice daily' | 'Three times daily' | 'Four times daily' | 'Every other day' | 'Weekly' | 'As needed' | 'Every 4 hours' | 'Every 6 hours' | 'Every 8 hours' | 'Every 12 hours';
  duration: string;
  durationValue: number;
  durationUnit: 'days' | 'weeks' | 'months' | 'ongoing';
  route: 'Oral' | 'Topical' | 'Injectable (SC)' | 'Injectable (IM)' | 'Injectable (IV)' | 'Sublingual' | 'Intranasal' | 'Ophthalmic' | 'Otic' | 'Rectal' | 'Inhalation';
  instructions: string;
  foodRestriction: 'None' | 'With food' | 'Before food' | 'After food' | 'Empty stomach' | 'With water';
  foodRestrictionNotes: string;
  alternatives: string[];
  quantity: number;
  refillsRemaining: number;
  stockItemId: string;
};

export type Prescription = {
  id: string;
  prescriptionNumber: string;
  petId: string;
  ownerId: string;
  medRecordId: string;
  vet: string;
  date: string;
  status: 'Active' | 'Completed' | 'Pending' | 'Expired' | 'Cancelled';
  items: PrescriptionItem[];
  diagnosis: string;
  notes: string;
  isRepeat: boolean;
  repeatCount: number;
  maxRepeats: number;
  parentPrescriptionId: string;
  expiresAt: string;
  verified: boolean;
  dispensed: boolean;
  dispensedDate: string;
  dispensedBy: string;
};

export type CollectionType<C extends Collection> = C extends 'owners'
  ? Owner
  : C extends 'pets'
  ? Pet
  : C extends 'appointments'
  ? Appointment
  : C extends 'medRecords'
  ? MedRecord
  : C extends 'medStock'
  ? MedStock
  : C extends 'invoices'
  ? Invoice
  : C extends 'expenses'
  ? Expense
  : C extends 'staff'
  ? Staff
  : C extends 'boarding'
  ? BoardingPet
  : C extends 'grooming'
  ? GroomingAppt
  : C extends 'vaccinations'
  ? Vaccination
  : C extends 'prescriptions'
  ? Prescription
  : C extends 'surgeries'
  ? Surgery
  : C extends 'labTests'
  ? LabTest
  : C extends 'suppliers'
  ? Supplier
  : C extends 'purchases'
  ? Purchase
  : C extends 'pharmacySales'
  ? PharmacySale
  : C extends 'warehouses'
  ? Warehouse
  : C extends 'inventoryItems'
  ? InventoryItem
  : C extends 'stockTransfers'
  ? StockTransfer
  : C extends 'stockAdjustments'
  ? StockAdjustment
  : C extends 'campaigns'
  ? Campaign
  : C extends 'segments'
  ? Segment
  : C extends 'messages'
  ? SiteMessage
  : C extends 'siteReviews'
  ? SiteReview
  : C extends 'subscribers'
  ? Subscriber
  : never;

export type StaffAssignment = {
  role: 'Surgeon' | 'Anesthetist' | 'Surgical Nurse' | 'Assistant' | 'Recovery Nurse';
  staffId: string;
  staffName: string;
};

export type EquipmentItem = {
  id: string;
  name: string;
  category: 'Surgical instrument' | 'Anesthesia equipment' | 'Monitoring device' | 'Consumable' | 'Imaging';
  required: boolean;
  checked: boolean;
  notes: string;
};

export type AnesthesiaVital = {
  time: string;
  heartRate: number;
  respiratoryRate: number;
  temperatureC: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  oxygenLevel: number;
  etCO2: number;
  notes: string;
};

export type RecoveryVital = {
  time: string;
  temperatureC: number;
  heartRate: number;
  respiratoryRate: number;
  painScore: number;
  consciousness: 'Awake' | 'Drowsy' | 'Stuporous' | 'Unconscious';
  notes: string;
};

export type Surgery = {
  id: string;
  surgeryNumber: string;
  petId: string;
  ownerId: string;
  appointmentId: string;
  medRecordId: string;
  prescriptionIds: string[];
  invoiceId: string;
  procedureName: string;
  procedureType: 'Planned' | 'Emergency';
  category: 'Soft tissue' | 'Orthopedic' | 'Dental' | 'Ophthalmic' | 'Neurologic' | 'Abdominal' | 'Other';
  date: string;
  time: string;
  estimatedDurationMin: number;
  actualDurationMin: number;
  status: 'Scheduled' | 'Pre-op' | 'In surgery' | 'Recovery' | 'Completed' | 'Cancelled';
  theater: string;
  staff: StaffAssignment[];
  equipmentChecklist: EquipmentItem[];
  consentSigned: boolean;
  consentSignedBy: string;
  consentDate: string;
  consentNotes: string;
  preOpNotes: string;
  preOpVitals: VitalSigns;
  preOpDiagnosis: string;
  preOpBloodwork: string;
  fastingHours: number;
  surgeryNotes: string;
  findings: string;
  complications: string;
  outcome: 'Successful' | 'Successful with complications' | 'Unsuccessful' | 'Pending';
  anestheticProtocol: string;
  premedication: string;
  inductionAgent: string;
  inductionDose: string;
  maintenanceAgent: string;
  maintenanceDose: string;
  analgesia: string;
  fluidTherapy: string;
  anesthesiaVitals: AnesthesiaVital[];
  recoveryVitals: RecoveryVital[];
  recoveryNotes: string;
  painManagement: string;
  dischargeDate: string;
  dischargeSummary: string;
  homeCareInstructions: string;
  followUpDate: string;
  followUpNotes: string;
  createdAt: string;
};

export type LabResultParameter = {
  id: string;
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: 'Normal' | 'Low' | 'High' | 'Critical' | 'N/A';
};

export type SampleTrackingEntry = {
  id: string;
  stage: 'Collected' | 'Received' | 'In analysis' | 'Completed' | 'Rejected';
  timestamp: string;
  technician: string;
  notes: string;
};

export type LabImage = {
  id: string;
  name: string;
  url: string;
  description: string;
};

export type LabTest = {
  id: string;
  testNumber: string;
  petId: string;
  ownerId: string;
  medRecordId: string;
  appointmentId: string;
  invoiceId: string;
  testType: 'Blood test' | 'Urine test' | 'Stool test' | 'Imaging';
  testCategory: 'CBC' | 'Biochemistry' | 'Urinalysis' | 'Fecal' | 'Culture' | 'X-ray' | 'Ultrasound' | 'MRI' | 'CT scan' | 'Cytology' | 'Histopathology' | 'Other';
  testName: string;
  templateId: string;
  requestedBy: string;
  dateOrdered: string;
  dateCompleted: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  status: 'Ordered' | 'Sample collected' | 'In analysis' | 'Completed' | 'Cancelled';
  barcode: string;
  sampleType: string;
  sampleVolume: string;
  collectionMethod: string;
  collectedBy: string;
  collectionDate: string;
  storageCondition: string;
  sampleTracking: SampleTrackingEntry[];
  results: LabResultParameter[];
  impression: string;
  findings: string;
  interpretation: string;
  notes: string;
  imagingRegion: string;
  imagingModality: string;
  contrastUsed: boolean;
  imageCount: number;
  images: LabImage[];
  reportGenerated: boolean;
  reportGeneratedDate: string;
  digitallySigned: boolean;
  signedBy: string;
  signedDate: string;
  signedRole: string;
  cost: number;
  createdAt: string;
};

/* ──────────────────────────────────────────────────────────────
   Marketing + public-website collections
   ────────────────────────────────────────────────────────────── */

export type Campaign = {
  id: string;
  name: string;
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'Push' | 'Mixed';
  status: 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed';
  targetSegment: string;
  segmentId: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  reach: number;
  opens: number;
  clicks: number;
  conversions: number;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type SegmentRuleField =
  | 'loyaltyPoints'
  | 'totalSpent'
  | 'visitCount'
  | 'daysSinceLastVisit'
  | 'petAgeYears'
  | 'petSpecies'
  | 'vaccinationDue';

export type SegmentRule = {
  field: SegmentRuleField;
  op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: string;
};

export type Segment = {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  match: 'all' | 'any';
  createdBy: string;
  createdAt: string;
};

export type MessageAttachment = { name: string; size: number };

export type SiteMessage = {
  id: string;
  reference: string;
  source: 'Contact form' | 'FAQ question' | 'Booking request' | 'Other';
  name: string;
  email: string;
  phone: string;
  petName: string;
  topic: string;
  branch: string;
  message: string;
  attachments: MessageAttachment[];
  consent: boolean;
  status: 'New' | 'In progress' | 'Answered' | 'Closed';
  assignedTo: string;
  response: string;
  receivedAt: string;
  respondedAt: string;
};

export type SiteReview = {
  id: string;
  reference: string;
  name: string;
  email: string;
  petName: string;
  service: string;
  rating: number;
  text: string;
  photos: { name: string }[];
  consentToPublish: boolean;
  status: 'Pending' | 'Published' | 'Rejected';
  moderatedBy: string;
  reply: string;
  submittedAt: string;
};

export type Subscriber = {
  id: string;
  email: string;
  source: string;
  consent: boolean;
  status: 'Subscribed' | 'Unsubscribed';
  subscribedAt: string;
  unsubscribedAt: string;
};

export type Collection =
  | 'owners'
  | 'pets'
  | 'appointments'
  | 'medRecords'
  | 'medStock'
  | 'invoices'
  | 'expenses'
  | 'staff'
  | 'boarding'
  | 'grooming'
  | 'vaccinations'
  | 'prescriptions'
  | 'surgeries'
  | 'labTests'
  | 'suppliers'
  | 'purchases'
  | 'pharmacySales'
  | 'warehouses'
  | 'inventoryItems'
  | 'stockTransfers'
  | 'stockAdjustments'
  | 'campaigns'
  | 'segments'
  | 'messages'
  | 'siteReviews'
  | 'subscribers';

const endpointMap: Record<Collection, string> = {
  owners: 'owners',
  pets: 'pets',
  appointments: 'appointments',
  medRecords: 'med-records',
  medStock: 'med-stock',
  invoices: 'invoices',
  expenses: 'expenses',
  staff: 'staff',
  boarding: 'boarding',
  grooming: 'grooming',
  vaccinations: 'vaccinations',
  prescriptions: 'prescriptions',
  surgeries: 'surgeries',
  labTests: 'lab-tests',
  suppliers: 'suppliers',
  purchases: 'purchases',
  pharmacySales: 'pharmacy-sales',
  warehouses: 'warehouses',
  inventoryItems: 'inventory-items',
  stockTransfers: 'stock-transfers',
  stockAdjustments: 'stock-adjustments',
  campaigns: 'campaigns',
  segments: 'segments',
  messages: 'messages',
  siteReviews: 'site-reviews',
  subscribers: 'subscribers',
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const today = todayISO;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDB(): Promise<DB> {
  return apiFetch<DB>('/aggregate');
}

export async function createItem<C extends Collection>(
  collection: C,
  item: CollectionType<C>,
): Promise<CollectionType<C>> {
  return apiFetch<CollectionType<C>>(`/${endpointMap[collection]}`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateItem<C extends Collection>(
  collection: C,
  id: string,
  patch: Partial<CollectionType<C>>,
): Promise<CollectionType<C>> {
  return apiFetch<CollectionType<C>>(`/${endpointMap[collection]}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteItem(collection: Collection, id: string): Promise<void> {
  await apiFetch(`/${endpointMap[collection]}/${id}`, { method: 'DELETE' });
}

export async function fetchConfig<T>(key: string): Promise<T | null> {
  try {
    const res = await apiFetch<{ key: string; data: T }>(`/config/${key}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function saveConfig<T>(key: string, data: T): Promise<T> {
  const res = await apiFetch<{ key: string; data: T }>(`/config/${key}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}
