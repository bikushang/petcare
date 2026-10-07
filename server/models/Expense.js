const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    number: { type: String, default: '', unique: true, sparse: true },
    date: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Equipment', 'Maintenance', 'Marketing', 'Insurance', 'Professional fees', 'Travel', 'Bank charges', 'Taxes', 'Other'],
      default: 'Other',
    },
    description: { type: String, default: '' },
    vendor: { type: String, default: '' },
    vendorId: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Transfer', 'Cheque', ''], default: '' },
    status: { type: String, enum: ['Paid', 'Pending', 'Scheduled'], default: 'Paid' },
    recurring: { type: Boolean, default: false },
    recurrencePattern: { type: String, enum: ['None', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'], default: 'None' },
    receiptNumber: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Expense', ExpenseSchema);
