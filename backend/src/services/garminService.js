/**
 * @file Garmin service for handling Garmin data
 * @description Service for Garmin integration, syncing data, and database operations
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const garminWrapper = require('../utils/garmin_wrapper');

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
 * Get the most recent activity date from database
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - Most recent activity date or null
 */
async function getMostRecentActivityDate(userId) {
  try {
    const result = await db.query(
      'SELECT TO_CHAR(start_time, \'YYYY-MM-DD\') as date FROM garmin_activities WHERE user_id = $1 ORDER BY start_time DESC LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].date : null;
  } catch (error) {
    logger.error(`Failed to get most recent activity date: ${error.message}`);
    return null;
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
 * Calculate the optimal date range for data sync
 * @param {number} userId - User ID
 * @param {string} requestedStartDate - Requested start date (YYYY-MM-DD)
 * @param {string} requestedEndDate - Requested end date (YYYY-MM-DD) (optional)
 * @param {string} dataType - Type of data ('activities' or 'daily_summaries')
 * @returns {Promise<Object>} - Optimized date range { startDate, endDate }
 */
async function calculateOptimalDateRange(userId, requestedStartDate, requestedEndDate, dataType) {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  const endDate = requestedEndDate || formattedToday;

  // Get most recent date from database
  const mostRecentDate = dataType === 'activities'
    ? await getMostRecentActivityDate(userId)
    : await getMostRecentDailySummaryDate(userId);

  // If we have data and the requested start date is earlier than our most recent data
  if (mostRecentDate) {
    const mostRecentDateTime = new Date(mostRecentDate);
    // Add one day to get data since last sync
    mostRecentDateTime.setDate(mostRecentDateTime.getDate() + 1);
    const nextDay = mostRecentDateTime.toISOString().split('T')[0];

    // If requested start date is before our last sync date, use the day after last sync
    if (new Date(requestedStartDate) < mostRecentDateTime) {
      logger.debug(`Optimizing date range for ${dataType}. Using ${nextDay} instead of ${requestedStartDate}`);
      return { startDate: nextDay, endDate };
    }
  }

  // Use requested date range
  return { startDate: requestedStartDate, endDate };
}

/**
 * Import activities from Garmin
 * @param {number} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @returns {Promise<Object>} Import result
 */
async function importActivities(userId, startDate, endDate = null) {
  try {
    // Check if user has an active connection
    const connectionStatus = await checkConnectionStatus(userId);
    if (!connectionStatus.connected || !connectionStatus.isActive) {
      return { success: false, error: 'No active Garmin connection' };
    }

    if (!connectionStatus.hasCredentials) {
      return { success: false, error: 'Garmin credentials not provided' };
    }

    // Get user credentials
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'Garmin credentials not found' };
    }

    // Calculate optimal date range
    const { startDate: optimalStart, endDate: optimalEnd } =
      await calculateOptimalDateRange(userId, startDate, endDate, 'activities');

    // If the optimal start date is after the end date, no need to fetch anything
    if (new Date(optimalStart) > new Date(optimalEnd)) {
      return {
        success: true,
        message: 'Data already up to date.',
        imported: 0,
        total: 0
      };
    }

    // Get activities from Garmin
    const activities = await garminWrapper.getActivities(optimalStart, optimalEnd, credentials);

    if (activities.error) {
      logger.error(`Error getting activities from Garmin: ${activities.error}`);
      return { success: false, error: activities.error };
    }

    // Insert or update activities in database
    const importedCount = await storeActivities(userId, activities);

    // Update last sync time
    await db.query(
      'UPDATE garmin_connections SET last_sync_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    return {
      success: true,
      imported: importedCount,
      total: activities.length,
      message: `Retrieved ${activities.length} activities from ${optimalStart} to ${optimalEnd}. Imported ${importedCount}.`
    };
  } catch (error) {
    logger.error(`Failed to import Garmin activities: ${error.message}`);
    throw error;
  }
}

/**
 * Store activities in database
 * @param {number} userId - User ID
 * @param {Array} activities - List of activities
 * @returns {Promise<number>} - Number of imported activities
 */
async function storeActivities(userId, activities) {
  try {
    let importedCount = 0;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      for (const activity of activities) {
        const existingResult = await client.query(
          'SELECT id FROM garmin_activities WHERE user_id = $1 AND garmin_activity_id = $2',
          [userId, activity.activityId]
        );

        if (existingResult.rows.length === 0) {
          // Insert new activity
          await client.query(
            `INSERT INTO garmin_activities (
              user_id, garmin_activity_id, activity_name, activity_type, start_time,
              duration_seconds, distance_meters, calories, avg_heart_rate, max_heart_rate,
              steps, elevation_gain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              userId,
              activity.activityId,
              activity.activityName,
              activity.activityType,
              activity.startTime,
              activity.durationSeconds,
              activity.distanceMeters,
              activity.calories,
              activity.avgHeartRate,
              activity.maxHeartRate,
              activity.steps,
              activity.elevationGain
            ]
          );
          importedCount++;
        } else {
          // Update existing activity
          await client.query(
            `UPDATE garmin_activities SET
              activity_name = $3, activity_type = $4, start_time = $5,
              duration_seconds = $6, distance_meters = $7, calories = $8,
              avg_heart_rate = $9, max_heart_rate = $10, steps = $11,
              elevation_gain = $12, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND garmin_activity_id = $2`,
            [
              userId,
              activity.activityId,
              activity.activityName,
              activity.activityType,
              activity.startTime,
              activity.durationSeconds,
              activity.distanceMeters,
              activity.calories,
              activity.avgHeartRate,
              activity.maxHeartRate,
              activity.steps,
              activity.elevationGain
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to store activities: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }

    return importedCount;
  } catch (error) {
    logger.error(`Failed to store activities: ${error.message}`);
    throw error;
  }
}

/**
 * Get daily summary for a user on a specific date
 * @param {number} userId - User ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {boolean} forceRefresh - Force refresh from Garmin API even if cached
 * @returns {Promise<Object>} Daily summary or error
 */
async function getDailySummary(userId, date, forceRefresh = false) {
  try {
    logger.info(`Getting daily summary for user ${userId} on ${date}${forceRefresh ? ' (force refresh)' : ''}`);

    // Check if summary exists in database and we're not forcing refresh
    if (!forceRefresh) {
      const summary = await db.query(
        `SELECT * FROM garmin_daily_summaries WHERE user_id = $1 AND date = $2`,
        [userId, date]
      );

      if (summary.rows.length > 0) {
        logger.info(`Found daily summary in database for user ${userId} on ${date}`);
        // Return raw data directly without processing
        logger.info(`Returning raw database data without any processing`);
        return summary.rows[0];
      }
    } else {
      logger.info(`Force refresh requested, bypassing database cache for user ${userId} on ${date}`);
    }

    // Not found in database or force refresh, try to get from Garmin
    logger.info(`${forceRefresh ? 'Force refreshing' : 'No data found in database for'} ${date}, fetching from Garmin API`);

    // Get user credentials
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      logger.warn(`No Garmin credentials found for user ${userId}`);
      return { error: 'No Garmin credentials found' };
    }

    try {
      // Try to get summary from Garmin
      const garminSummary = await garminWrapper.getDailySummary(date, credentials, forceRefresh);
      if (garminSummary.error) {
        return { error: garminSummary.error };
      }

      // Store in database
      await storeDailySummaries(userId, [garminSummary]);

      // Return the raw Garmin data
      logger.info(`Got fresh data from Garmin API for ${date}`);

      // Fetch the stored data to ensure consistency with database format
      const storedSummary = await db.query(
        `SELECT * FROM garmin_daily_summaries WHERE user_id = $1 AND date = $2`,
        [userId, date]
      );

      if (storedSummary.rows.length > 0) {
        logger.info(`Returning freshly stored data without any processing`);
        return storedSummary.rows[0];
      }

      return garminSummary;
    } catch (error) {
      logger.error(`Error getting daily summary from Garmin for ${date}: ${error.message}`);
      return { error: `Failed to get Garmin daily summary: ${error.message}` };
    }
  } catch (error) {
    logger.error(`Failed to get daily summary: ${error.message}`);
    return { error: error.message };
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
    // Check if user has an active connection
    const connectionStatus = await checkConnectionStatus(userId);
    if (!connectionStatus.connected || !connectionStatus.isActive) {
      return { success: false, error: 'No active Garmin connection' };
    }

    if (!connectionStatus.hasCredentials) {
      return { success: false, error: 'Garmin credentials not provided' };
    }

    // Get user credentials
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'Garmin credentials not found' };
    }

    // Calculate optimal date range (skip if force refreshing)
    const { startDate: optimalStart, endDate: optimalEnd } = forceRefresh
      ? { startDate, endDate: endDate || startDate }
      : await calculateOptimalDateRange(userId, startDate, endDate, 'daily_summaries');

    // If the optimal start date is after the end date and we're not force refreshing, no need to fetch anything
    if (!forceRefresh && new Date(optimalStart) > new Date(optimalEnd)) {
      return {
        success: true,
        message: 'Daily summaries already up to date.',
        imported: 0,
        total: 0
      };
    }

    logger.info(`${forceRefresh ? 'Force refreshing' : 'Syncing'} daily summaries for user ${userId} from ${optimalStart} to ${optimalEnd}`);

    // Get daily summaries from Garmin
    const summaries = await garminWrapper.getDailySummaries(optimalStart, optimalEnd, credentials, forceRefresh);

    // Handle error response
    if (summaries && summaries.error) {
      logger.error(`Error getting daily summaries from Garmin: ${summaries.error}`);
      return { success: false, error: summaries.error };
    }

    // Ensure summaries is an array for proper handling
    if (!Array.isArray(summaries)) {
      logger.warn(`Unexpected result from Garmin API - expected array but got: ${typeof summaries}`);
      return {
        success: false,
        error: `Unexpected data format from Garmin API: ${typeof summaries}`
      };
    }

    // Log raw summaries for debugging
    logger.debug(`Retrieved ${summaries.length} summaries from Garmin: ${JSON.stringify(summaries)}`);

    // Store daily summaries in database
    const importedCount = await storeDailySummaries(userId, summaries);

    // Update last sync time
    await db.query(
      'UPDATE garmin_connections SET last_sync_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    return {
      success: true,
      imported: importedCount,
      total: summaries.length,
      message: `Retrieved ${summaries.length} daily summaries from ${optimalStart} to ${optimalEnd}. Imported ${importedCount}.`
    };
  } catch (error) {
    logger.error(`Failed to sync Garmin daily summaries: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Store daily summaries in database
 * @param {number} userId - User ID
 * @param {Array} summaries - List of daily summaries
 * @returns {Promise<number>} - Number of imported summaries
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
 * Get activities list for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - List of activities
 */
async function getActivities(userId, options = {}) {
  try {
    const { limit = 20, offset = 0, startDate, endDate, activityType } = options;

    let query = `
      SELECT * FROM garmin_activities
      WHERE user_id = $1
    `;
    const queryParams = [userId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND start_time >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND start_time <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    if (activityType) {
      query += ` AND activity_type = $${paramCount}`;
      queryParams.push(activityType);
      paramCount++;
    }

    query += ` ORDER BY start_time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);
    return result.rows;
  } catch (error) {
    logger.error(`Failed to get activities: ${error.message}`);
    throw error;
  }
}

/**
 * Get activity details
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object>} Activity details
 */
async function getActivityDetails(userId, activityId) {
  try {
    // First check if we have the activity in our database
    const activityResult = await db.query(
      'SELECT * FROM garmin_activities WHERE user_id = $1 AND garmin_activity_id = $2',
      [userId, activityId]
    );

    if (activityResult.rows.length === 0) {
      return { error: 'Activity not found' };
    }

    // Get user credentials for additional details
    const credentials = await getUserCredentials(userId);
    if (!credentials) {
      // Return just the database data if no credentials
      return activityResult.rows[0];
    }

    // Get additional details from Garmin if needed
    try {
      const details = await garminWrapper.getActivityDetails(activityId, credentials);
      return {
        ...activityResult.rows[0],
        details
      };
    } catch (error) {
      // Return just the database data if we can't get details from Garmin
      logger.error(`Error getting activity details from Garmin: ${error.message}`);
      return activityResult.rows[0];
    }
  } catch (error) {
    logger.error(`Failed to get activity details: ${error.message}`);
    throw error;
  }
}

/**
 * Get daily summaries for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - List of daily summaries
 */
async function getDailySummaries(userId, options = {}) {
  try {
    const { limit = 30, offset = 0, startDate, endDate } = options;

    let query = `
      SELECT * FROM garmin_daily_summaries
      WHERE user_id = $1
    `;
    const queryParams = [userId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND date <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);
    return result.rows;
  } catch (error) {
    logger.error(`Failed to get daily summaries: ${error.message}`);
    throw error;
  }
}

/**
 * Test Garmin connection by fetching basic profile data
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
 * Test the Python environment
 * @returns {Promise<Object>} Python environment information
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
 * Sync both daily summaries and activities for a user
 * @param {number} userId - User ID
 * @param {Object} credentials - Garmin credentials
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} - Sync result
 */
async function syncGarminData(userId, credentials, startDate, endDate) {
  try {
    logger.info(`Syncing Garmin data for user ${userId} from ${startDate} to ${endDate}`);

    // First sync daily summaries
    const summaryResult = await syncDailySummaries(
      userId,
      startDate,
      endDate
    );

    // Then sync activities
    const activitiesResult = await importActivities(
      userId,
      startDate,
      endDate
    );

    return {
      userId,
      summaryResult,
      activitiesResult,
      success: true
    };
  } catch (error) {
    logger.error(`Error syncing Garmin data: ${error.message}`);
    return {
      userId,
      error: error.message,
      success: false
    };
  }
}

module.exports = {
  checkConnectionStatus,
  getUserCredentials,
  connectAccount,
  disconnectAccount,
  importActivities,
  syncDailySummaries,
  getMostRecentActivityDate,
  getMostRecentDailySummaryDate,
  calculateOptimalDateRange,
  getActivities,
  getActivityDetails,
  getDailySummary,
  getDailySummaries,
  testConnection,
  testPythonEnvironment,
  syncGarminData
};