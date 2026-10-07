/**
 * Server entry point.
 * Connects to MongoDB, auto-seeds if empty, then starts the Express server.
 */
require('dotenv').config();

const { connectDB } = require('./config/db');
const { seedIfEmpty } = require('./controllers/seedController');
const app = require('./app');

const PORT = process.env.API_PORT || 3001;

async function start() {
  try {
    await connectDB();
    const seedResult = await seedIfEmpty();
    console.log(`[seed] ${seedResult.message}`);
    app.listen(PORT, () => {
      console.log(`[server] PetCare Pro API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
