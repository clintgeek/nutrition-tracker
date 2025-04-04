// Load environment variables from .env.local in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
  console.log('Loaded .env.local for development environment');
} else {
  require('dotenv').config();
  console.log('Loaded .env for production environment');
}

const app = require('./app');
const logger = require('./config/logger');
const cronService = require('./services/cronService');

// Set NODE_ENV to development if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Get port from environment or use default
const PORT = process.env.BACKEND_PORT || 4081;

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // // Start the background Garmin sync job -- DISABLED based on new strategy
  // const syncIntervalMinutes = parseInt(process.env.GARMIN_SYNC_INTERVAL_MINUTES || '15', 10);
  // logger.info(`Starting Garmin background sync job with ${syncIntervalMinutes} minute interval`);
  // cronService.startGarminSyncJob(syncIntervalMinutes);
});