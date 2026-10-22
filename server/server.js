/**
 * Server entry point.
 * Connects to MongoDB, then starts the Express server.
 */
require('dotenv').config();

const { connectDB } = require('./config/db');
const app = require('./app');

const PORT = process.env.API_PORT || 3001;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[server] Vetnora API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
