/**
 * @file Routes for fitness tracking and Garmin integration
 */

const express = require('express');
const router = express.Router();
const garminService = require('../services/garminService');
const { authenticate } = require('../middleware/auth');
const { validateDate, validateDateRange } = require('../utils/validators');
const logger = require('../utils/logger');
const cronService = require('../services/cronService');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Admin middleware
const isAdmin = async (req, res, next) => {
  try {
    // Check if user is admin - assuming admin is user with ID 1
    // You might want to replace this with a more robust check
    if (req.user && req.user.id === 1) {
      return next();
    }
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  } catch (error) {
    logger.error(`Error in admin middleware: ${error.message}`);
    return res.status(500).json({ error: 'Server error checking admin status' });
  }
};

/**
 * @route GET /api/fitness/garmin/status
 * @desc Get Garmin connection status for the current user
 * @access Private
 */
router.get('/garmin/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await garminService.checkConnectionStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error(`Error checking Garmin connection status: ${error.message}`);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

/**
 * @route POST /api/fitness/garmin/connect
 * @desc Connect user's Garmin account
 * @access Private
 */
router.post('/garmin/connect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await garminService.connectAccount(userId, username, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Garmin account connected successfully' });
  } catch (error) {
    logger.error(`Error connecting Garmin account: ${error.message}`);
    res.status(500).json({ error: 'Failed to connect Garmin account' });
  }
});

/**
 * @route POST /api/fitness/garmin/disconnect
 * @desc Disconnect user's Garmin account
 * @access Private
 */
router.post('/garmin/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Disconnect request received for user ${userId}`);

    const result = await garminService.disconnectAccount(userId);
    logger.info(`Disconnect result for user ${userId}:`, result);

    if (!result.success) {
      logger.warn(`Disconnect failed for user ${userId}: ${result.error}`);
      return res.status(400).json({ error: result.error });
    }

    logger.info(`Disconnect successful for user ${userId}`);
    res.json({ success: true, message: 'Garmin account disconnected successfully' });
  } catch (error) {
    logger.error(`Error disconnecting Garmin account for user ${req.user.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to disconnect Garmin account' });
  }
});

/**
 * @route GET /api/fitness/garmin/daily/:date
 * @desc Get daily summary for a specific date - returns raw data without processing
 */
router.get('/garmin/daily/:date', authenticate, async (req, res) => {
  try {
    const { date } = req.params;
    const forceRefresh = req.query.forceRefresh === 'true';

    // Validate date format
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD format.' });
    }

    const userId = req.user.id;
    logger.info(`Getting daily summary for user ${userId} and date ${date}${forceRefresh ? ' (force refresh)' : ''}`);

    // Get daily summary directly without any processing
    const summary = await garminService.getDailySummary(userId, date, forceRefresh);

    if (summary.error) {
      logger.warn(`Error getting daily summary: ${summary.error}`);
      // Check if it's a rate limit error
      if (summary.error.includes('429') || summary.error.includes('Too Many Requests')) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT',
          message: 'Garmin API rate limit reached. Please try again later.'
        });
      }
      // For other errors, return 404 or appropriate status
      return res.status(404).json({ success: false, error: summary.error });
    }

    // Log the activity minutes fields for debugging
    logger.info(`Daily summary activity data for ${date}:
      - Keys: ${Object.keys(summary).join(', ')}
      - minutes_highly_active: ${summary.minutes_highly_active !== undefined ? summary.minutes_highly_active : 'undefined'}
      - minutes_moderately_active: ${summary.minutes_moderately_active !== undefined ? summary.minutes_moderately_active : 'undefined'}
      - minutes_lightly_active: ${summary.minutes_lightly_active !== undefined ? summary.minutes_lightly_active : 'undefined'}
      - minutes_sedentary: ${summary.minutes_sedentary !== undefined ? summary.minutes_sedentary : 'undefined'}
      - total_steps: ${summary.total_steps !== undefined ? summary.total_steps : 'undefined'}
      - type of total_steps: ${typeof summary.total_steps}
    `);

    // Return raw data directly to client
    logger.info(`Returning raw summary data for ${date} without processing`);
    res.json(summary);
  } catch (error) {
    logger.error(`Error getting daily summary: ${error.message}`);
    // Handle potential rate limit exceptions thrown by the service/wrapper
    if (error.message.includes('Rate limit exceeded')) {
       return res.status(429).json({
         success: false,
         error: 'RATE_LIMIT',
         message: 'Garmin API rate limit reached. Please try again later.'
       });
    }
    res.status(500).json({ error: 'Failed to get daily summary' });
  }
});

/**
 * @route GET /api/fitness/garmin/daily
 * @desc Get daily summaries for a date range
 * @access Private
 */
router.get('/garmin/daily', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const summaries = await garminService.getDailySummaries(userId, startDate, endDate);
    res.json(summaries);
  } catch (error) {
    logger.error(`Error getting Garmin daily summaries: ${error.message}`);
    res.status(500).json({ error: 'Failed to get daily summaries' });
  }
});

/**
 * @route PUT /api/fitness/garmin/credentials
 * @desc Update user's Garmin credentials
 * @access Private
 */
router.put('/garmin/credentials', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user has a connection
    const status = await garminService.checkConnectionStatus(userId);

    if (!status.connected) {
      return res.status(400).json({ error: 'No Garmin connection found. Please connect first.' });
    }

    // Connect will update credentials for an existing connection
    const result = await garminService.connectAccount(userId, username, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Garmin credentials updated successfully' });
  } catch (error) {
    logger.error(`Error updating Garmin credentials: ${error.message}`);
    res.status(500).json({ error: 'Failed to update Garmin credentials' });
  }
});

/**
 * @route GET /api/fitness/garmin/test
 * @desc Test Garmin connection and authentication without importing data
 * @access Private
 */
router.get('/garmin/test', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionStatus = await garminService.checkConnectionStatus(userId);

    if (!connectionStatus.connected || !connectionStatus.isActive) {
      return res.status(400).json({ success: false, error: 'No active Garmin connection' });
    }

    if (!connectionStatus.hasCredentials) {
      return res.status(400).json({ success: false, error: 'Garmin credentials not provided' });
    }

    // Try to authenticate with Garmin
    const testResult = await garminService.testConnection(userId);

    if (testResult.success) {
      return res.json({
        success: true,
        message: 'Successfully authenticated with Garmin',
        profile: testResult.profile
      });
    } else {
      return res.status(400).json({
        success: false,
        error: testResult.error || 'Failed to authenticate with Garmin'
      });
    }
  } catch (error) {
    logger.error(`Error testing Garmin connection: ${error.message}`);
    res.status(500).json({ error: 'Failed to test Garmin connection' });
  }
});

/**
 * @route GET /api/fitness/garmin/debug
 * @desc Debug Garmin service
 * @access Private
 */
router.get('/garmin/debug', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const debugInfo = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      checkpoints: []
    };

    // Check connection status
    try {
      debugInfo.checkpoints.push({ step: 'Checking connection status' });
      const status = await garminService.checkConnectionStatus(userId);
      debugInfo.connection_status = status;
    } catch (error) {
      debugInfo.checkpoints.push({ step: 'Connection status error', error: error.message });
    }

    // Check if credentials exist
    if (debugInfo.connection_status?.hasCredentials) {
      try {
        debugInfo.checkpoints.push({ step: 'Getting credentials' });
        // We don't return the actual credentials for security reasons
        const credentials = await garminService.getUserCredentials(userId);
        debugInfo.has_credentials = !!credentials;
        if (credentials) {
          // Mask credentials
          debugInfo.credentials_summary = {
            username: credentials.username ? '***' + credentials.username.slice(-4) : 'not set',
            password: credentials.password ? '*****' : 'not set'
          };
        }
      } catch (error) {
        debugInfo.checkpoints.push({ step: 'Credentials error', error: error.message });
      }
    }

    // Check Python environment
    try {
      debugInfo.checkpoints.push({ step: 'Checking Python environment' });
      const pythonInfo = await garminService.testPythonEnvironment();
      debugInfo.python_environment = pythonInfo;
    } catch (error) {
      debugInfo.checkpoints.push({ step: 'Python environment error', error: error.message });
    }

    // Check database connection to garmin-related tables
    try {
      debugInfo.checkpoints.push({ step: 'Checking database tables' });
      const db = require('../db');
      const garminTables = await db.query(`
        SELECT table_name, COUNT(*) as row_count
        FROM information_schema.tables
        JOIN (
          SELECT 'garmin_connections' AS table_name
          UNION SELECT 'garmin_activities'
          UNION SELECT 'garmin_daily_summaries'
        ) AS garmin_tables ON information_schema.tables.table_name = garmin_tables.table_name
        WHERE table_schema = 'public'
        GROUP BY table_name;
      `);
      debugInfo.database_tables = garminTables.rows;
    } catch (error) {
      debugInfo.checkpoints.push({ step: 'Database check error', error: error.message });
    }

    res.json(debugInfo);
  } catch (error) {
    logger.error(`Error in Garmin debug endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to debug Garmin service' });
  }
});

/**
 * @route POST /api/fitness/garmin/clear-sample-data
 * @desc Clear sample data from the database
 * @access Private
 */
router.post('/garmin/clear-sample-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Clearing sample data for user ${userId}`);

    const result = await garminService.clearSampleData(userId);
    logger.info(`Sample data clearing result for user ${userId}:`, result);

    res.json(result);
  } catch (error) {
    logger.error(`Error clearing sample data for user ${req.user.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to clear sample data' });
  }
});

/**
 * @route GET /api/fitness/garmin/sync/status
 * @desc Get background sync status
 * @access Private
 */
router.get('/garmin/sync/status', authenticate, async (req, res) => {
  try {
    const status = cronService.getSyncStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error(`Error getting sync status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/fitness/garmin/sync/start
 * @desc Start background sync with specified interval
 * @access Private (admin only)
 */
router.post('/garmin/sync/start', authenticate, isAdmin, async (req, res) => {
  try {
    const { intervalMinutes } = req.body;
    cronService.startGarminSyncJob(intervalMinutes);

    const status = cronService.getSyncStatus();
    res.json({
      success: true,
      message: `Background sync started with ${status.interval} minute interval`,
      ...status
    });
  } catch (error) {
    logger.error(`Error starting sync job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to start background sync',
      error: error.message
    });
  }
});

/**
 * @route POST /api/fitness/garmin/sync/stop
 * @desc Stop background sync
 * @access Private (admin only)
 */
router.post('/garmin/sync/stop', authenticate, isAdmin, async (req, res) => {
  try {
    cronService.stopGarminSyncJob();
    res.json({
      success: true,
      message: 'Background sync stopped',
      active: false
    });
  } catch (error) {
    logger.error(`Error stopping sync job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to stop background sync',
      error: error.message
    });
  }
});

/**
 * @route POST /api/fitness/garmin/sync/update-interval
 * @desc Update background sync interval
 * @access Private (admin only)
 */
router.post('/garmin/sync/update-interval', authenticate, isAdmin, async (req, res) => {
  try {
    const { intervalMinutes } = req.body;

    if (!intervalMinutes || intervalMinutes < 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interval. Must be at least 5 minutes.'
      });
    }

    cronService.updateSyncInterval(intervalMinutes);

    const status = cronService.getSyncStatus();
    res.json({
      success: true,
      message: `Sync interval updated to ${intervalMinutes} minutes`,
      ...status
    });
  } catch (error) {
    logger.error(`Error updating sync interval: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update sync interval',
      error: error.message
    });
  }
});

/**
 * @route POST /api/fitness/garmin/sync/now
 * @desc Trigger an immediate sync for all users
 * @access Private (admin only)
 */
router.post('/garmin/sync/now', authenticate, isAdmin, async (req, res) => {
  try {
    // Run in background to avoid hanging the request
    res.json({
      success: true,
      message: 'Manual sync triggered',
    });

    // Run after response is sent
    setTimeout(async () => {
      try {
        await cronService.runGarminSync();
        logger.info('Manual sync completed');
      } catch (error) {
        logger.error(`Error in manual sync: ${error.message}`);
      }
    }, 100);
  } catch (error) {
    logger.error(`Error triggering manual sync: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual sync',
      error: error.message
    });
  }
});

/**
 * @route GET /api/fitness/garmin/dev-mode-status
 * @desc Check if Garmin API calls are enabled
 * @access Private
 */
router.get('/garmin/dev-mode-status', authenticate, async (req, res) => {
  try {
    // Check the current setting
    const enabled = process.env.ENABLE_GARMIN_API !== 'false';

    res.json({
      enabled,
      mode: process.env.NODE_ENV
    });
  } catch (error) {
    logger.error(`Error checking Garmin API status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to check Garmin API status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/fitness/garmin/toggle-dev-mode
 * @desc Toggle Garmin API access
 * @access Private
 */
router.post('/garmin/toggle-dev-mode', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;

    // Read the current .env file
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envConfig = {};

    try {
      if (fs.existsSync(envPath)) {
        envConfig = dotenv.parse(fs.readFileSync(envPath));
      }
    } catch (err) {
      logger.error(`Error reading .env file: ${err.message}`);
    }

    // Update the setting
    envConfig.ENABLE_GARMIN_API = enabled ? 'true' : 'false';

    // Write it back to the file
    const envContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, envContent);

    // Update the environment variable in the current process
    process.env.ENABLE_GARMIN_API = enabled ? 'true' : 'false';

    // Log the change
    logger.info(`Garmin API set to: ${enabled ? 'enabled' : 'disabled'}`);

    res.json({
      success: true,
      enabled,
      message: `Garmin API calls are now ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    logger.error(`Error updating Garmin API setting: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update Garmin API setting',
      error: error.message
    });
  }
});

module.exports = router;