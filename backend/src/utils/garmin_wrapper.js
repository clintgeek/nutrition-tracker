/**
 * @file Wrapper for the Garmin Python service
 * Handles process execution and data parsing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Define the path to the Python virtual environment and script
const PYTHON_SCRIPT_PATH = path.join(__dirname, '../python/garmin/garmin_service.py');
const PYTHON_VENV_PATH = path.join(__dirname, '../../venv/bin/python3');

// Track API call counts and implement rate limiting
const API_RATE_LIMITS = {
  authenticate: { max: 5, interval: 3600000 }, // 5 calls per hour
  profile: { max: 10, interval: 3600000 }, // 10 calls per hour
  activities: { max: 15, interval: 3600000 }, // 15 calls per hour
  activity_details: { max: 20, interval: 3600000 }, // 20 calls per hour
  daily_summary: { max: 15, interval: 3600000 }, // 15 calls per hour
  daily_summaries: { max: 10, interval: 3600000 }, // 10 calls per hour
};

// Track API calls per user
const apiCallTracking = {
  // username: {
  //   command: {
  //     calls: [],  // Array of timestamps
  //     lastError: null  // Last error message
  //   }
  // }
};

/**
 * Check if the rate limit has been exceeded for a user and command
 * @param {string} username - Garmin username
 * @param {string} command - The command being executed
 * @returns {boolean} - True if rate limited, false otherwise
 */
function isRateLimited(username, command) {
  if (!apiCallTracking[username]) {
    apiCallTracking[username] = {};
  }

  if (!apiCallTracking[username][command]) {
    apiCallTracking[username][command] = { calls: [], lastError: null };
  }

  const tracking = apiCallTracking[username][command];
  const limits = API_RATE_LIMITS[command] || { max: 5, interval: 3600000 }; // Default 5 calls per hour

  // Clean up old timestamps
  const now = Date.now();
  tracking.calls = tracking.calls.filter(time => now - time < limits.interval);

  // Check if we've exceeded the rate limit
  if (tracking.calls.length >= limits.max) {
    const oldestCall = tracking.calls[0];
    const timeToWait = limits.interval - (now - oldestCall);
    logger.warn(`Rate limit exceeded for ${username} on ${command}. Try again in ${Math.ceil(timeToWait / 60000)} minutes.`);
    return true;
  }

  return false;
}

/**
 * Track an API call for a user and command
 * @param {string} username - Garmin username
 * @param {string} command - The command being executed
 */
function trackApiCall(username, command) {
  if (!apiCallTracking[username]) {
    apiCallTracking[username] = {};
  }

  if (!apiCallTracking[username][command]) {
    apiCallTracking[username][command] = { calls: [], lastError: null };
  }

  // Add current timestamp
  apiCallTracking[username][command].calls.push(Date.now());
}

/**
 * Track an API error for a user and command
 * @param {string} username - Garmin username
 * @param {string} command - The command being executed
 * @param {string} error - The error message
 */
function trackApiError(username, command, error) {
  if (!apiCallTracking[username]) {
    apiCallTracking[username] = {};
  }

  if (!apiCallTracking[username][command]) {
    apiCallTracking[username][command] = { calls: [], lastError: null };
  }

  // Store error message
  apiCallTracking[username][command].lastError = error;
}

// Simple in-memory cache for responses
const responseCache = {
  // username: {
  //   command_args_hash: {
  //     data: {},
  //     timestamp: Date.now()
  //   }
  // }
};

// Cache TTL in milliseconds
const CACHE_TTL = {
  authenticate: 60 * 60 * 1000, // 1 hour
  profile: 12 * 60 * 60 * 1000, // 12 hours
  activities: 30 * 60 * 1000, // 30 minutes
  activity_details: 24 * 60 * 60 * 1000, // 24 hours
  daily_summary: 5 * 60 * 1000, // 5 minutes (was 15 minutes)
  daily_summaries: 5 * 60 * 1000, // 5 minutes (was 15 minutes)
};

/**
 * Create a cache key from command and arguments
 * @param {string} command - The command to execute
 * @param {Object} args - The arguments for the command
 * @returns {string} - The cache key
 */
function createCacheKey(command, args) {
  return command + '_' + JSON.stringify(args);
}

/**
 * Get cached response if available
 * @param {string} username - Garmin username
 * @param {string} command - The command to execute
 * @param {Object} args - The arguments for the command
 * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
 * @returns {Object|null} - The cached response or null
 */
function getCachedResponse(username, command, args, forceRefresh = false) {
  // If forceRefresh is true, ignore cache and return null
  if (forceRefresh) {
    logger.debug(`Force refresh requested for ${username}/${command}, bypassing cache`);
    return null;
  }

  if (!responseCache[username]) {
    return null;
  }

  const cacheKey = createCacheKey(command, args);
  const cachedItem = responseCache[username][cacheKey];

  if (!cachedItem) {
    return null;
  }

  const ttl = CACHE_TTL[command] || (60 * 60 * 1000); // Default 1 hour
  const now = Date.now();

  // Check if cache has expired
  if (now - cachedItem.timestamp > ttl) {
    delete responseCache[username][cacheKey];
    return null;
  }

  logger.debug(`Using cached response for ${username}/${command}`);
  return cachedItem.data;
}

/**
 * Cache a response
 * @param {string} username - Garmin username
 * @param {string} command - The command to execute
 * @param {Object} args - The arguments for the command
 * @param {Object} data - The response data to cache
 */
function cacheResponse(username, command, args, data) {
  if (!responseCache[username]) {
    responseCache[username] = {};
  }

  const cacheKey = createCacheKey(command, args);
  responseCache[username][cacheKey] = {
    data,
    timestamp: Date.now()
  };

  logger.debug(`Cached response for ${username}/${command}`);
}

/**
 * Execute a Python command and return the results
 * @param {string} command - The command to execute
 * @param {Object} args - The arguments for the command
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @param {Object} options - Additional options { forceRefresh }
 * @returns {Promise<Object>} - The parsed JSON result
 */
async function executeGarminCommand(command, args = {}, credentials = {}, options = {}) {
  // Check if Python script exists
  if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
    logger.error(`Python script not found at ${PYTHON_SCRIPT_PATH}`);
    throw new Error('Garmin service Python script not found');
  }

  // Check if Python venv exists, fall back to system python3 if not
  let pythonExecutable = 'python3';
  if (fs.existsSync(PYTHON_VENV_PATH)) {
    pythonExecutable = PYTHON_VENV_PATH;
    logger.debug(`Using virtual environment Python: ${PYTHON_VENV_PATH}`);
  } else {
    logger.warn(`Python virtual environment not found at ${PYTHON_VENV_PATH}, falling back to system python3`);
  }

  // Ensure required credentials are available
  if (!credentials.username || !credentials.password) {
    logger.error('Garmin credentials are not provided');
    throw new Error('Garmin credentials missing');
  }

  // Check for rate limiting
  if (isRateLimited(credentials.username, command)) {
    throw new Error(`Rate limit exceeded for Garmin API command: ${command}`);
  }

  // Check cache for non-authenticate commands
  if (command !== 'authenticate') {
    const cachedResponse = getCachedResponse(credentials.username, command, args, options.forceRefresh);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // If we're here, we're either force refreshing or the cache is invalid
  if (options.forceRefresh) {
    logger.info(`Force refreshing data from Garmin API for command: ${command}`);
  } else {
    logger.info(`Cache miss or expired, fetching fresh data from Garmin API for command: ${command}`);
  }

  // Build the command arguments
  const cmdArgs = [
    PYTHON_SCRIPT_PATH,
    command,
    '--username', credentials.username,
    '--password', credentials.password
  ];

  // Add additional arguments based on the command
  Object.entries(args).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cmdArgs.push(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value.toString());
    }
  });

  logger.debug(`Executing Garmin command: ${command}`);

  // Track this API call
  trackApiCall(credentials.username, command);

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, cmdArgs);

    let dataString = '';
    let errorString = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Collect errors from stderr
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      logger.error(`Garmin Python error: ${data.toString()}`);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`Garmin Python process exited with code ${code}`);
        const errorMsg = `Process exited with code ${code}: ${errorString}`;
        trackApiError(credentials.username, command, errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      try {
        // Log the raw output for debugging
        logger.debug(`Raw output from Python command ${command}: ${dataString.trim()}`);

        // Attempt to find valid JSON in the output
        let jsonData = dataString.trim();

        // First, check if the output is already valid JSON
        try {
          const result = JSON.parse(jsonData);

          // Cache successful response for non-authenticate commands
          if (command !== 'authenticate' && result && !result.error) {
            cacheResponse(credentials.username, command, args, result);
          }

          resolve(result);
          return;
        } catch (err) {
          // Continue with cleanup if not valid JSON
          logger.debug(`Initial JSON parse failed, attempting cleanup: ${err.message}`);
        }

        // Try to find JSON brackets to extract only the JSON part
        const firstCurly = jsonData.indexOf('{');
        const firstBracket = jsonData.indexOf('[');

        // Determine if the JSON starts with an object or array
        let jsonStart = -1;
        let isArray = false;

        if (firstCurly >= 0 && (firstBracket < 0 || firstCurly < firstBracket)) {
          jsonStart = firstCurly;
          isArray = false;
        } else if (firstBracket >= 0) {
          jsonStart = firstBracket;
          isArray = true;
        }

        if (jsonStart > 0) {
          logger.warn(`Found extra output before JSON, cleaning: ${jsonData.substring(0, jsonStart)}`);
          jsonData = jsonData.substring(jsonStart);
        }

        // Find the appropriate end character based on whether we're parsing an array or object
        const endChar = isArray ? ']' : '}';
        const lastEndChar = jsonData.lastIndexOf(endChar);

        if (lastEndChar > 0) {
          if (lastEndChar < jsonData.length - 1) {
            logger.warn(`Found extra output after JSON, cleaning: ${jsonData.substring(lastEndChar + 1)}`);
            jsonData = jsonData.substring(0, lastEndChar + 1);
          }

          try {
            const result = JSON.parse(jsonData);

            // Cache successful response for non-authenticate commands
            if (command !== 'authenticate' && result && !result.error) {
              cacheResponse(credentials.username, command, args, result);
            }

            resolve(result);
            return;
          } catch (jsonError) {
            // Log the error and fallback to default error response
            logger.error(`Failed to parse cleaned JSON: ${jsonError.message}`);
            logger.error(`Cleaned JSON data: ${jsonData}`);
          }
        }

        // If we got here, we couldn't parse the JSON properly
        logger.error(`Failed to parse JSON result after cleanup attempts`);
        logger.error(`Raw output: ${dataString}`);

        // Return a descriptive error
        resolve({
          error: `Failed to parse Garmin API response`,
          rawData: dataString.substring(0, 200) // Include part of raw data for debugging
        });
      } catch (error) {
        logger.error(`Failed to process Python result: ${error.message}`);
        logger.error(`Raw output: ${dataString}`);
        trackApiError(credentials.username, command, error.message);
        reject(new Error(`Failed to process Python result: ${error.message}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      logger.error(`Failed to start Garmin Python process: ${error.message}`);
      trackApiError(credentials.username, command, error.message);
      reject(error);
    });

    // Set a timeout to kill the process if it takes too long
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      logger.error('Garmin Python process timed out');
      trackApiError(credentials.username, command, 'Process timed out');
      reject(new Error('Process timed out'));
    }, 30000); // 30 second timeout

    // Clear the timeout if the process completes
    pythonProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Authenticate with Garmin Connect
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticate(credentials) {
  try {
    return await executeGarminCommand('authenticate', {}, credentials);
  } catch (error) {
    logger.error(`Authentication failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get user profile from Garmin Connect
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @returns {Promise<Object>} - User profile data
 */
async function getUserProfile(credentials) {
  try {
    return await executeGarminCommand('profile', {}, credentials);
  } catch (error) {
    logger.error(`Failed to get user profile: ${error.message}`);
    throw error;
  }
}

/**
 * Get activities from Garmin Connect
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @returns {Promise<Array>} - List of activities
 */
async function getActivities(startDate, endDate, credentials) {
  try {
    return await executeGarminCommand('activities', { startDate, endDate }, credentials);
  } catch (error) {
    logger.error(`Failed to get activities: ${error.message}`);
    throw error;
  }
}

/**
 * Get activity details from Garmin Connect
 * @param {string} activityId - Activity ID
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @returns {Promise<Object>} - Activity details
 */
async function getActivityDetails(activityId, credentials) {
  try {
    return await executeGarminCommand('activity_details', { activityId }, credentials);
  } catch (error) {
    logger.error(`Failed to get activity details: ${error.message}`);
    throw error;
  }
}

/**
 * Get daily summary from Garmin Connect
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
 * @returns {Promise<Object>} - Daily summary data
 */
async function getDailySummary(date, credentials, forceRefresh = false) {
  try {
    return await executeGarminCommand('daily_summary', { date }, credentials, { forceRefresh });
  } catch (error) {
    logger.error(`Failed to get daily summary: ${error.message}`);
    throw error;
  }
}

/**
 * Get daily summaries from Garmin Connect
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @param {Object} credentials - The Garmin credentials { username, password }
 * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
 * @returns {Promise<Array>} - List of daily summaries
 */
async function getDailySummaries(startDate, endDate, credentials, forceRefresh = false) {
  try {
    return await executeGarminCommand('daily_summaries', { startDate, endDate }, credentials, { forceRefresh });
  } catch (error) {
    logger.error(`Failed to get daily summaries: ${error.message}`);
    throw error;
  }
}

// Export the paths
module.exports = {
  executeGarminCommand,
  PYTHON_SCRIPT_PATH,
  PYTHON_VENV_PATH,
  authenticate,
  getUserProfile,
  getActivities,
  getActivityDetails,
  getDailySummary,
  getDailySummaries
};