/**
 * @file Garmin service for handling Garmin data
 * @description Service for Garmin integration, syncing data, and database operations
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const garminWrapper = require('../utils/garmin_wrapper');

const STALE_THRESHOLD_MINUTES = 15;

/**
 * Get user's Garmin credentials from database
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Garmin credentials or null if not found
 */
async function getUserCredentials(userId) {
  try {
    const result = await db.query(
      'SELECT username, password FROM garmin_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].username || !result.rows[0].password) {
      return null;
    }

    return {
      username: result.rows[0].username,
      password: result.rows[0].password
    };
  } catch (error) {
    logger.error(`Failed to get Garmin credentials: ${error.message}`);
    return null;
  }
}

/**
 * Check if user has an active Garmin connection
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Status of Garmin connection
 */
async function checkConnectionStatus(userId) {
  try {
    logger.info(`Checking Garmin connection status for user ${userId}`);

    const result = await db.query(
      'SELECT id, is_active, username, password, last_sync_time FROM garmin_connections WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      logger.info(`No Garmin connection found for user ${userId}`);
      return { connected: false };
    }

    const connectionData = result.rows[0];
    logger.info(`Garmin connection found for user ${userId}. Active: ${connectionData.is_active}, Has credentials: ${!!(connectionData.username && connectionData.password)}`);

    return {
      connected: true,
      isActive: connectionData.is_active,
      lastSyncTime: connectionData.last_sync_time,
      hasCredentials: !!(connectionData.username && connectionData.password)
    };
  } catch (error) {
    logger.error(`Failed to check Garmin connection status: ${error.message}`);
    throw error;
  }
}

/**
 * Connect user's Garmin account
 * @param {number} userId - User ID
 * @param {string} username - Garmin Connect username
 * @param {string} password - Garmin Connect password
 * @returns {Promise<Object>} Connection result
 */
async function connectAccount(userId, username, password) {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    // First authenticate with Garmin to verify credentials
    const authResult = await garminWrapper.authenticate({ username, password });

    if (!authResult.success) {
      logger.error('Garmin authentication failed');
      return { success: false, error: 'Authentication failed' };
    }

    // Check if connection already exists
    const connectionCheck = await db.query(
      'SELECT id FROM garmin_connections WHERE user_id = $1',
      [userId]
    );

    // Either update or insert the connection
    if (connectionCheck.rows.length > 0) {
      await db.query(
        'UPDATE garmin_connections SET username = $2, password = $3, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId, username, password]
      );
    } else {
      await db.query(
        'INSERT INTO garmin_connections (user_id, username, password, is_active) VALUES ($1, $2, $3, true)',
        [userId, username, password]
      );
    }

    return { success: true };
  } catch (error) {
    logger.error(`Failed to connect Garmin account: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect user's Garmin account
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Disconnection result
 */
async function disconnectAccount(userId) {
  try {
    logger.info(`Disconnecting Garmin account for user ${userId}`);

    // First check if there is an active connection
    const connectionCheck = await db.query(
      'SELECT id, is_active FROM garmin_connections WHERE user_id = $1',
      [userId]
    );

    if (connectionCheck.rows.length === 0) {
      logger.warn(`No Garmin connection found for user ${userId}`);
      return { success: false, error: 'No Garmin connection found' };
    }

    // Even if not active, we'll set it to inactive again to confirm the operation
    const result = await db.query(
      'UPDATE garmin_connections SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING id',
      [userId]
    );

    if (result.rowCount === 0) {
      logger.warn(`Failed to update Garmin connection for user ${userId}`);
      return { success: false, error: 'Failed to disconnect account' };
    }

    logger.info(`Successfully disconnected Garmin account for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to disconnect Garmin account: ${error.message}`);
    throw error;
  }
}

/**
 * Get the most recent daily summary date from database
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - Most recent daily summary date or null
 */
async function getMostRecentDailySummaryDate(userId) {
  try {
    const result = await db.query(
      'SELECT TO_CHAR(date, \'YYYY-MM-DD\') as date FROM garmin_daily_summaries WHERE user_id = $1 ORDER BY date DESC LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].date : null;
  } catch (error) {
    logger.error(`Failed to get most recent daily summary date: ${error.message}`);
    return null;
  }
}

/**
 * Store daily summaries in database
 * @param {number} userId - User ID
 * @param {Array<Object>} summaries - Array of daily summary objects from API
 * @returns {Promise<number>} Count of inserted/updated summaries
 */
async function storeDailySummaries(userId, summaries) {
  try {
    let importedCount = 0;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      for (const summary of summaries) {
        const existingResult = await client.query(
          'SELECT id FROM garmin_daily_summaries WHERE user_id = $1 AND date = $2',
          [userId, summary.date]
        );

        // Map field names from Python script to database columns
        const mappedSummary = {
          totalSteps: summary.total_steps,
          totalDistanceMeters: summary.total_distance_meters,
          totalCalories: summary.total_calories,
          activeCalories: summary.active_calories,
          bmrCalories: summary.bmr_calories,
          avgHeartRate: summary.avg_heart_rate,
          maxHeartRate: summary.max_heart_rate,
          restingHeartRate: summary.resting_heart_rate,
          avgStressLevel: summary.avg_stress_level,
          floorsClimbed: summary.floor_climbed,
          minutesSedentary: summary.minutes_sedentary,
          minutesLightlyActive: summary.minutes_lightly_active,
          minutesModeratelyActive: summary.minutes_moderately_active,
          minutesHighlyActive: summary.minutes_highly_active
        };

        if (existingResult.rows.length === 0) {
          // Insert new summary
          await client.query(
            `INSERT INTO garmin_daily_summaries (
              user_id, date, total_steps, total_distance_meters, total_calories,
              active_calories, bmr_calories, avg_heart_rate, max_heart_rate,
              resting_heart_rate, avg_stress_level, floor_climbed,
              minutes_sedentary, minutes_lightly_active, minutes_moderately_active, minutes_highly_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              userId,
              summary.date,
              mappedSummary.totalSteps,
              mappedSummary.totalDistanceMeters,
              mappedSummary.totalCalories,
              mappedSummary.activeCalories,
              mappedSummary.bmrCalories,
              mappedSummary.avgHeartRate,
              mappedSummary.maxHeartRate,
              mappedSummary.restingHeartRate,
              mappedSummary.avgStressLevel,
              mappedSummary.floorsClimbed,
              mappedSummary.minutesSedentary,
              mappedSummary.minutesLightlyActive,
              mappedSummary.minutesModeratelyActive,
              mappedSummary.minutesHighlyActive
            ]
          );
          importedCount++;
        } else {
          // Update existing summary
          await client.query(
            `UPDATE garmin_daily_summaries SET
              total_steps = $3, total_distance_meters = $4, total_calories = $5,
              active_calories = $6, bmr_calories = $7, avg_heart_rate = $8,
              max_heart_rate = $9, resting_heart_rate = $10, avg_stress_level = $11,
              floor_climbed = $12, minutes_sedentary = $13, minutes_lightly_active = $14,
              minutes_moderately_active = $15, minutes_highly_active = $16,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND date = $2`,
            [
              userId,
              summary.date,
              mappedSummary.totalSteps,
              mappedSummary.totalDistanceMeters,
              mappedSummary.totalCalories,
              mappedSummary.activeCalories,
              mappedSummary.bmrCalories,
              mappedSummary.avgHeartRate,
              mappedSummary.maxHeartRate,
              mappedSummary.restingHeartRate,
              mappedSummary.avgStressLevel,
              mappedSummary.floorsClimbed,
              mappedSummary.minutesSedentary,
              mappedSummary.minutesLightlyActive,
              mappedSummary.minutesModeratelyActive,
              mappedSummary.minutesHighlyActive
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to store daily summaries: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }

    return importedCount;
  } catch (error) {
    logger.error(`Failed to store daily summaries: ${error.message}`);
    throw error;
  }
}

/**
 * Sync daily summaries from Garmin
 * @param {number} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @param {boolean} forceRefresh - Force refresh from Garmin API even if cached
 * @returns {Promise<Object>} Sync result
 */
async function syncDailySummaries(userId, startDate, endDate = null, forceRefresh = false) {
  try {
    logger.info(`${forceRefresh ? 'Force refreshing' : 'Syncing'} daily summaries for user ${userId} from ${startDate} to ${endDate || startDate}`);

    // Check connection and credentials
    const connectionStatus = await checkConnectionStatus(userId);
    if (!connectionStatus.connected || !connectionStatus.isActive || !connectionStatus.hasCredentials) {
      return { success: false, error: 'No active Garmin connection with credentials' };
    }
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'Garmin credentials not found' };
    }

    // Get daily summaries from Garmin wrapper
    const summaries = await garminWrapper.getDailySummaries(startDate, endDate || startDate, credentials, forceRefresh);

    if (summaries && summaries.error) {
      logger.error(`Error getting daily summaries from Garmin: ${summaries.error}`);
      return { success: false, error: summaries.error };
    }

    if (!Array.isArray(summaries)) {
      logger.warn(`Unexpected result from Garmin API - expected array but got: ${typeof summaries}`);
      return {
        success: false,
        error: `Unexpected data format from Garmin API: ${typeof summaries}`
      };
    }

    // Store daily summaries in database
    const importedCount = await storeDailySummaries(userId, summaries);

    // Update last sync time ONLY if we successfully fetched from API
    if (summaries.length > 0 || importedCount > 0) { // Check if we actually got data
      await db.query(
        'UPDATE garmin_connections SET last_sync_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      logger.info(`Updated last_sync_time for user ${userId} after successful sync.`);
    } else {
      logger.info(`No new summaries fetched for user ${userId}, last_sync_time not updated.`);
    }

    return {
      success: true,
      imported: importedCount,
      total: summaries.length,
      message: `Retrieved ${summaries.length} daily summaries from ${startDate} to ${endDate || startDate}. Imported ${importedCount}.`
    };
  } catch (error) {
    logger.error(`Failed to sync Garmin daily summaries: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get daily summary for a specific date, triggering sync if stale
 * @param {number} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {boolean} forceRefresh - Force refresh from Garmin API
 * @returns {Promise<Object>} Daily summary data or error object
 */
async function getDailySummary(userId, date, forceRefresh = false) {
  try {
    logger.info(`Getting daily summary for user ${userId} on ${date}${forceRefresh ? ' (force refresh)' : ''}`);
    let summaryFromDb = null;

    // Check if refresh is needed (either forced or stale data)
    let shouldRefresh = forceRefresh;
    if (!forceRefresh) {
      const connectionStatus = await checkConnectionStatus(userId);
      if (connectionStatus.connected && connectionStatus.isActive && connectionStatus.hasCredentials) {
        const lastSync = connectionStatus.lastSyncTime ? new Date(connectionStatus.lastSyncTime) : null;
        if (!lastSync) {
          logger.info(`No last sync time found for user ${userId}, triggering initial sync.`);
          shouldRefresh = true;
        } else {
          const minutesSinceLastSync = (new Date() - lastSync) / (1000 * 60);
          if (minutesSinceLastSync > STALE_THRESHOLD_MINUTES) {
            logger.info(`Data is stale (${minutesSinceLastSync.toFixed(1)} mins > ${STALE_THRESHOLD_MINUTES} mins), triggering refresh.`);
            shouldRefresh = true;
          } else {
            logger.info(`Data is fresh (${minutesSinceLastSync.toFixed(1)} mins <= ${STALE_THRESHOLD_MINUTES} mins), using cached DB data.`);
          }
        }
      }
    }

    // If refresh is needed, trigger sync for the specific requested date
    if (shouldRefresh) {
      logger.info(`Triggering live fetch for user ${userId} for specific date ${date}`);
      try {
        const credentials = await getUserCredentials(userId);
        if (!credentials) {
          throw new Error('Garmin credentials not found during refresh attempt');
        }

        // Call the wrapper for a SINGLE day summary
        const summaryData = await garminWrapper.getDailySummary(date, credentials, true);

        // Check for errors from the wrapper
        if (summaryData && summaryData.error) {
          logger.warn(`Garmin wrapper failed to get single day summary for ${date}: ${summaryData.error}`);
          // Do not return here, let the DB fetch proceed, but log the failure
          // Potentially return the specific error if needed? For now, just log.
        } else if (summaryData) {
          // Store the single summary (wrapper expects an array)
          await storeDailySummaries(userId, [summaryData]);
          // Update last sync time ONLY if we successfully fetched and stored
          await db.query(
            'UPDATE garmin_connections SET last_sync_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
            [userId]
          );
          logger.info(`Updated last_sync_time for user ${userId} after successful single day fetch for ${date}.`);
        } else {
            logger.warn(`Garmin wrapper returned no data for single day summary ${date}`);
        }

      } catch (syncError) {
        // Log the error from the refresh attempt but don't halt execution
        // Let the function proceed to try and fetch from DB anyway
        logger.error(`Error during single day refresh attempt for user ${userId}, date ${date}: ${syncError.message}`);
        // We could potentially return an error here if a forced refresh fails critically
        // return { error: `Failed during forced refresh: ${syncError.message}` };
      }
    }

    // Always fetch the requested date's summary from the database after potential refresh attempt
    logger.debug(`Fetching summary for ${date} from database for user ${userId}`);
    const result = await db.query(
      'SELECT * FROM garmin_daily_summaries WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (result.rows.length === 0) {
      logger.info(`No summary found in DB for user ${userId} on ${date}`);
      // If we attempted a refresh and still have nothing, it might be a valid 'no data' day
      return { error: `No summary data found for ${date}` };
    }

    summaryFromDb = result.rows[0];
    logger.info(`Successfully retrieved summary from DB for user ${userId} on ${date}`);
    return summaryFromDb;

  } catch (error) {
    logger.error(`Error in getDailySummary: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Get daily summaries for a date range (directly from DB)
 * @param {number} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @returns {Promise<Array>} Array of daily summary objects
 */
async function getDailySummaries(userId, startDate, endDate = null) {
  try {
    const end = endDate || startDate;
    logger.info(`Getting daily summaries from DB for user ${userId} from ${startDate} to ${end}`);
    const result = await db.query(
      'SELECT * FROM garmin_daily_summaries WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC',
      [userId, startDate, end]
    );
    return result.rows;
  } catch (error) {
    logger.error(`Error fetching daily summaries from DB: ${error.message}`);
    throw error;
  }
}

/**
 * Test connection by attempting authentication
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Test result
 */
async function testConnection(userId) {
  try {
    // Get user credentials
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'Garmin credentials not found' };
    }

    // Try to authenticate and get basic profile data
    try {
      // First authenticate
      const authResult = await garminWrapper.authenticate(credentials);

      if (!authResult.success) {
        logger.error('Garmin authentication failed during test');
        return { success: false, error: 'Authentication failed' };
      }

      // Then try to get basic profile info
      const profileResult = await garminWrapper.getUserProfile(credentials);

      return {
        success: true,
        message: 'Successfully connected to Garmin',
        profile: profileResult
      };
    } catch (error) {
      logger.error(`Error testing Garmin connection: ${error.message}`);
      return {
        success: false,
        error: `Failed to connect to Garmin: ${error.message}`
      };
    }
  } catch (error) {
    logger.error(`Failed to test Garmin connection: ${error.message}`);
    throw error;
  }
}

/**
 * Test Python environment setup
 * @returns {Promise<Object>} Test result
 */
async function testPythonEnvironment() {
  const { spawn } = require('child_process');
  const pythonWrapper = require('../utils/garmin_wrapper');
  const fs = require('fs');
  const path = require('path');

  const pythonInfo = {
    python_venv_path: pythonWrapper.PYTHON_VENV_PATH,
    python_script_path: pythonWrapper.PYTHON_SCRIPT_PATH,
    python_exists: false,
    python_version: null,
    garminconnect_installed: false,
    garminconnect_version: null,
    environment_variables: {}
  };

  // Check if Python script exists
  pythonInfo.script_exists = fs.existsSync(pythonWrapper.PYTHON_SCRIPT_PATH);

  // Check if venv exists
  pythonInfo.venv_exists = fs.existsSync(pythonWrapper.PYTHON_VENV_PATH);

  // Determine which Python to use
  const pythonExecutable = pythonInfo.venv_exists
    ? pythonWrapper.PYTHON_VENV_PATH
    : 'python3';

  // Get Python version
  try {
    const pythonVersionPromise = new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, ['-V']);
      let output = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`));
        }
      });
    });

    pythonInfo.python_version = await pythonVersionPromise;
    pythonInfo.python_exists = true;
  } catch (error) {
    logger.error(`Failed to get Python version: ${error.message}`);
    pythonInfo.python_error = error.message;
  }

  // Check for garminconnect package
  try {
    const garminVersionPromise = new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, [
        '-c',
        'try:\n  import garminconnect\n  print(f"garminconnect {garminconnect.__version__}")\nexcept ImportError as e:\n  print(f"ImportError: {e}")\nexcept AttributeError:\n  print("garminconnect installed but no version info")'
      ]);

      let output = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`));
        }
      });
    });

    const garminResult = await garminVersionPromise;
    if (garminResult.startsWith('garminconnect ')) {
      pythonInfo.garminconnect_installed = true;
      pythonInfo.garminconnect_version = garminResult;
    } else {
      pythonInfo.garminconnect_error = garminResult;
    }
  } catch (error) {
    logger.error(`Failed to check garminconnect package: ${error.message}`);
    pythonInfo.garminconnect_error = error.message;
  }

  // Get relevant environment variables
  const envVars = ['PATH', 'PYTHONPATH', 'VIRTUAL_ENV'];
  envVars.forEach(varName => {
    if (process.env[varName]) {
      pythonInfo.environment_variables[varName] = process.env[varName];
    }
  });

  return pythonInfo;
}

/**
 * Clear sample data for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Result
 */
async function clearSampleData(userId) {
  // ... (implementation remains the same)
}

module.exports = {
  getUserCredentials,
  checkConnectionStatus,
  connectAccount,
  disconnectAccount,
  getMostRecentDailySummaryDate,
  syncDailySummaries,
  getDailySummary,
  getDailySummaries,
  testConnection,
  testPythonEnvironment,
  clearSampleData,
};