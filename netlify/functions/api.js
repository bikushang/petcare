const serverless = require('serverless-http');
const app = require('../../server/app');
const { connectDB } = require('../../server/config/db');
const { seedIfEmpty } = require('../../server/controllers/seedController');

let initialized;

async function initialize() {
  if (!initialized) {
    initialized = connectDB().then(() => seedIfEmpty());
  }
  return initialized;
}

const handler = serverless(app, {
  request: {
    basePath: '/.netlify/functions/api',
  },
});

exports.handler = async (event, context) => {
  await initialize();
  return handler(event, context);
};
