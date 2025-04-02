/**
 * Cron Service
 * Handles scheduled background tasks like syncing Garmin data
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const db = require('../config/db');
const garminService = require('./garminService');

// Default sync interval in minutes
const DEFAULT_SYNC_INTERVAL = 15;

// Track currently running jobs
let garminSyncJob = null;
let syncInterval = DEFAULT_SYNC_INTERVAL;

/**
 * Get all active Garmin connections
 * @returns {Promise<Array>} List of active Garmin connections with user IDs
 */
async function getActiveGarminConnections() {
  try {
    const result = await db.query(
      'SELECT user_id, username, password FROM garmin_connections WHERE is_active = true'
    );
    return result.rows;
  } catch (error) {
    logger.error(`Error fetching active Garmin connections: ${error.message}`);
    throw error;
  }
}

/**
 * Sync Garmin data for a specific user
 * @param {Object} userData User connection data
 * @returns {Promise<Object>} Sync result
 */
async function syncUserGarminData(userData) {
  try {
    const userId = userData.user_id;
    logger.info(`Background sync: Processing user ${userId}`);

    // Get credentials
    const credentials = await garminService.getUserCredentials(userId);
    if (!credentials) {
      logger.warn(`Background sync: No credentials found for user ${userId}`);
      return { success: false, error: 'No credentials found' };
    }

    // Only sync one day of data to reduce API load
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Use force refresh to bypass cache
    logger.info(`Background sync: Syncing daily summary for ${userId} on ${todayStr} with force refresh`);
    const result = await garminService.syncDailySummaries(userId, todayStr, todayStr, true);

    // Update last sync time in the database
    await db.query(
      'UPDATE garmin_connections SET last_sync_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    return {
      userId,
      success: result.success,
      summaries: result.imported || 0,
      errors: result.error || null
    };
  } catch (error) {
    logger.error(`Background sync: Error syncing user ${userData.user_id}: ${error.message}`);
    return {
      userId: userData.user_id,
      success: false,
      errors: error.message
    };
  }
}

/**
 * Run Garmin sync for all active users
 * @returns {Promise<Object>} Sync results
 */
async function runGarminSync() {
  logger.info('Running scheduled Garmin data sync for all users');
  const startTime = Date.now();

  try {
    // Get all active Garmin connections
    const connections = await getActiveGarminConnections();

    if (connections.length === 0) {
      logger.info('No active Garmin connections found to sync');
      return { success: true, message: 'No active connections', count: 0 };
    }

    logger.info(`Found ${connections.length} active Garmin connections to sync`);

    // Track results
    const results = {
      total: connections.length,
      success: 0,
      failed: 0,
      details: []
    };

    // Sync each user one at a time to avoid hitting rate limits
    for (const connection of connections) {
      try {
        // Check if we should sync this user based on their last sync time
        const shouldSync = shouldSyncUser(connection);

        if (shouldSync) {
          logger.info(`Syncing data for user ${connection.user_id}`);
          const result = await syncUserGarminData(connection);

          results.details.push(result);

          if (result.success) {
            results.success++;
            logger.info(`Successfully synced data for user ${connection.user_id}`);
          } else {
            results.failed++;
            logger.warn(`Failed to sync data for user ${connection.user_id}: ${result.errors}`);
          }
        } else {
          logger.info(`Skipping sync for user ${connection.user_id} - recently synced`);
          results.details.push({
            userId: connection.user_id,
            skipped: true,
            reason: 'Recently synced'
          });
        }

        // Add delay between users to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (userError) {
        results.failed++;
        logger.error(`Error processing user ${connection.user_id}: ${userError.message}`);
        results.details.push({
          userId: connection.user_id,
          success: false,
          error: userError.message
        });
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.info(`Completed Garmin sync run in ${duration}s: ${results.success} succeeded, ${results.failed} failed`);

    return {
      success: true,
      duration,
      ...results
    };
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.error(`Failed to run Garmin sync: ${error.message}`);

    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Start the Garmin sync background job
 * @param {number} intervalMinutes - Sync interval in minutes (default: 15)
 */
function startGarminSyncJob(intervalMinutes = DEFAULT_SYNC_INTERVAL) {
  // Stop existing job if running
  if (garminSyncJob) {
    garminSyncJob.stop();
    garminSyncJob = null;
  }

  // Set the new interval
  syncInterval = intervalMinutes || DEFAULT_SYNC_INTERVAL;

  // Create cron schedule expression (e.g., "*/15 * * * *" for every 15 minutes)
  const cronSchedule = `*/${syncInterval} * * * *`;

  logger.info(`Starting Garmin sync job with schedule: ${cronSchedule} (every ${syncInterval} minutes)`);

  // Create and start the cron job
  garminSyncJob = cron.schedule(cronSchedule, runGarminSync);

  // Run once immediately
  runGarminSync();
}

/**
 * Stop the Garmin sync background job
 */
function stopGarminSyncJob() {
  if (garminSyncJob) {
    logger.info('Stopping Garmin sync job');
    garminSyncJob.stop();
    garminSyncJob = null;
  }
}

/**
 * Update the sync interval
 * @param {number} intervalMinutes - New interval in minutes
 */
function updateSyncInterval(intervalMinutes) {
  if (intervalMinutes !== syncInterval) {
    logger.info(`Updating Garmin sync interval from ${syncInterval} to ${intervalMinutes} minutes`);
    startGarminSyncJob(intervalMinutes);
  }
}

/**
 * Get the current sync status
 * @returns {Object} Current sync status
 */
function getSyncStatus() {
  return {
    active: garminSyncJob !== null,
    interval: syncInterval,
    nextRun: garminSyncJob ? 'Running on schedule' : 'Not scheduled'
  };
}

/**
 * Check if a user should be synced based on last sync time
 * @param {Object} connection User connection data
 * @returns {boolean} True if user should be synced
 */
function shouldSyncUser(connection) {
  // If no last sync time, definitely sync
  if (!connection.last_sync_time) {
    return true;
  }

  // Calculate time since last sync
  const lastSync = new Date(connection.last_sync_time);
  const now = new Date();
  const minutesSinceLastSync = Math.floor((now - lastSync) / (1000 * 60));

  // Only sync if it's been at least (syncInterval - 2) minutes since last sync
  // (giving a 2-minute buffer for potential overlaps)
  return minutesSinceLastSync >= (syncInterval - 2);
}

// Export the service functions
module.exports = {
  startGarminSyncJob,
  stopGarminSyncJob,
  updateSyncInterval,
  getSyncStatus,
  runGarminSync // Exported for manual triggering
};