/**
 * Aggregate controller — returns all collections in a single call.
 * The frontend uses this on initial load to hydrate the entire app state.
 */
const asyncHandler = require('../middleware/asyncHandler');
const Owner = require('../models/Owner');
const Pet = require('../models/Pet');
const Appointment = require('../models/Appointment');
const MedRecord = require('../models/MedRecord');
const MedStock = require('../models/MedStock');
const Invoice = require('../models/Invoice');
const Staff = require('../models/Staff');
const Boarding = require('../models/Boarding');
const Grooming = require('../models/Grooming');
const Vaccination = require('../models/Vaccination');
const Prescription = require('../models/Prescription');
const Surgery = require('../models/Surgery');
const LabTest = require('../models/LabTest');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const PharmacySale = require('../models/PharmacySale');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const StockTransfer = require('../models/StockTransfer');
const StockAdjustment = require('../models/StockAdjustment');
const Expense = require('../models/Expense');

const mapId = (d) => ({ ...d, id: d._id.toString() });

const aggregate = asyncHandler(async (req, res) => {
  const [owners, pets, appointments, medRecords, medStock, invoices, expenses, staff, boarding, grooming, vaccinations, prescriptions, surgeries, labTests, suppliers, purchases, pharmacySales, warehouses, inventoryItems, stockTransfers, stockAdjustments] =
    await Promise.all([
      Owner.find().lean(),
      Pet.find().lean(),
      Appointment.find().lean(),
      MedRecord.find().lean(),
      MedStock.find().lean(),
      Invoice.find().lean(),
      Expense.find().lean(),
      Staff.find().lean(),
      Boarding.find().lean(),
      Grooming.find().lean(),
      Vaccination.find().lean(),
      Prescription.find().lean(),
      Surgery.find().lean(),
      LabTest.find().lean(),
      Supplier.find().lean(),
      Purchase.find().lean(),
      PharmacySale.find().lean(),
      Warehouse.find().lean(),
      InventoryItem.find().lean(),
      StockTransfer.find().lean(),
      StockAdjustment.find().lean(),
    ]);

  res.json({
    owners: owners.map(mapId),
    pets: pets.map(mapId),
    appointments: appointments.map(mapId),
    medRecords: medRecords.map(mapId),
    medStock: medStock.map(mapId),
    invoices: invoices.map(mapId),
    expenses: expenses.map(mapId),
    staff: staff.map(mapId),
    boarding: boarding.map(mapId),
    grooming: grooming.map(mapId),
    vaccinations: vaccinations.map(mapId),
    prescriptions: prescriptions.map(mapId),
    surgeries: surgeries.map(mapId),
    labTests: labTests.map(mapId),
    suppliers: suppliers.map(mapId),
    purchases: purchases.map(mapId),
    pharmacySales: pharmacySales.map(mapId),
    warehouses: warehouses.map(mapId),
    inventoryItems: inventoryItems.map(mapId),
    stockTransfers: stockTransfers.map(mapId),
    stockAdjustments: stockAdjustments.map(mapId),
  });
});

module.exports = { aggregate };
