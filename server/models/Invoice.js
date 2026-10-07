const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    qty: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  taxable: { type: Boolean, default: true },
  category: { type: String, enum: ['Consultation', 'Surgery', 'Medication', 'Lab', 'Vaccination', 'Grooming', 'Boarding', 'Product', 'Other'], default: 'Other' },
  reference: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  cost: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  serviceDate: { type: String, default: '' },
  practitionerId: { type: String, default: '' },
    practitionerName: { type: String, default: '' },
  },
  { _id: false },
);

const PaymentSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    date: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    method: { type: String, enum: ['Cash', 'Card', 'Transfer', 'Insurance', 'Credit', 'Coupon', ''], default: '' },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    receivedBy: { type: String, default: '' },
  },
  { _id: false },
);

const TaxSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'VAT' },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    type: { type: String, enum: ['Percent', 'Fixed', ''], default: '' },
    value: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    docType: {
      type: String,
      enum: ['Invoice', 'Estimate', 'Receipt', 'Credit Note', 'Refund'],
      default: 'Invoice',
    },
    ownerId: { type: String, default: '', index: true },
    petId: { type: String, default: '', index: true },
    date: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['Fixed', 'Percent', ''], default: '' },
    coupon: [CouponSchema],
    taxes: [TaxSchema],
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Partial', 'Pending', 'Overdue', 'Refunded', 'Cancelled', 'Converted'],
      default: 'Pending',
    },
    method: {
      type: String,
      enum: ['Cash', 'Card', 'Transfer', 'Insurance', 'Credit', 'Coupon', ''],
      default: '',
    },
    payments: [PaymentSchema],
    notes: { type: String, default: '' },
    terms: { type: String, default: '' },
    linkedInvoiceId: { type: String, default: '' },
    linkedEstimateId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
