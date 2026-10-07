/**
 * Main Express app setup.
 * Wires middleware, routes, and error handling.
 */
const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const Owner = require('./models/Owner');
const Pet = require('./models/Pet');
const Appointment = require('./models/Appointment');
const MedRecord = require('./models/MedRecord');
const MedStock = require('./models/MedStock');
const Invoice = require('./models/Invoice');
const Expense = require('./models/Expense');
const Staff = require('./models/Staff');
const Boarding = require('./models/Boarding');
const Grooming = require('./models/Grooming');
const Vaccination = require('./models/Vaccination');
const Prescription = require('./models/Prescription');
const Surgery = require('./models/Surgery');
const LabTest = require('./models/LabTest');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const PharmacySale = require('./models/PharmacySale');
const Warehouse = require('./models/Warehouse');
const InventoryItem = require('./models/InventoryItem');
const StockTransfer = require('./models/StockTransfer');
const StockAdjustment = require('./models/StockAdjustment');

const createCrudRoutes = require('./routes/crudRoutes');
const aggregateRoutes = require('./routes/aggregateRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', aggregateRoutes);
app.use('/api/owners', createCrudRoutes(Owner));
app.use('/api/pets', createCrudRoutes(Pet));
app.use('/api/appointments', createCrudRoutes(Appointment));
app.use('/api/med-records', createCrudRoutes(MedRecord));
app.use('/api/med-stock', createCrudRoutes(MedStock));
app.use('/api/invoices', createCrudRoutes(Invoice));
app.use('/api/expenses', createCrudRoutes(Expense));
app.use('/api/staff', createCrudRoutes(Staff));
app.use('/api/boarding', createCrudRoutes(Boarding));
app.use('/api/grooming', createCrudRoutes(Grooming));
app.use('/api/vaccinations', createCrudRoutes(Vaccination));
app.use('/api/prescriptions', createCrudRoutes(Prescription));
app.use('/api/surgeries', createCrudRoutes(Surgery));
app.use('/api/lab-tests', createCrudRoutes(LabTest));
app.use('/api/suppliers', createCrudRoutes(Supplier));
app.use('/api/purchases', createCrudRoutes(Purchase));
app.use('/api/pharmacy-sales', createCrudRoutes(PharmacySale));
app.use('/api/warehouses', createCrudRoutes(Warehouse));
app.use('/api/inventory-items', createCrudRoutes(InventoryItem));
app.use('/api/stock-transfers', createCrudRoutes(StockTransfer));
app.use('/api/stock-adjustments', createCrudRoutes(StockAdjustment));

app.use(errorHandler);

module.exports = app;
