const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in environment');
  const dbName = process.env.MONGODB_DB || 'petcare_pro';
  await mongoose.connect(uri, { dbName });
  connected = true;
  console.log(`[db] Connected to MongoDB database "${dbName}"`);
}

function isConnected() {
  return connected;
}

module.exports = { connectDB, isConnected };
