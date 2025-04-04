import { api } from './api';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInMinutes } from 'date-fns';

/**
 * Interface for connection status response
 */
export interface GarminConnectionStatus {
  connected: boolean;
  isActive?: boolean;
  lastSyncTime?: string;
  hasCredentials?: boolean;
}

/**
 * Interface for Garmin credentials
 */
export interface GarminCredentials {
  username: string;
  password: string;
}

/**
 * Interface for Garmin daily summary
 */
export interface GarminDailySummary {
  id: number;
  user_id: number;
  date: string;
  total_steps: number;
  total_distance_meters: number;
  total_calories: number;
  active_calories: number;
  bmr_calories: number;
  avg_heart_rate: number;
  max_heart_rate: number;
  resting_heart_rate: number;
  avg_stress_level: number;
  floor_climbed: number;
  minutes_sedentary: number;
  minutes_lightly_active: number;
  minutes_moderately_active: number;
  minutes_highly_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for import/sync result
 */
export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  imported?: number;
  total?: number;
}

/**
 * Interface for sync status
 */
export interface SyncStatus {
  active: boolean;
  interval: number;
  nextRun: string;
}

export interface DevModeStatus {
  enabled: boolean;
  mode: string;
}

// Interface for the result of the new function
export interface RefreshedSummaryResult {
  summary: GarminDailySummary | null;
  error: any | null; // Can hold the error object
  source: 'live' | 'cache' | 'cache-fallback';
}

// AsyncStorage key
const LAST_LIVE_FETCH_KEY = '@garmin_last_live_fetch_timestamp';
const CACHE_DURATION_MINUTES = 15;

// Function to detect if error is a rate limit error (429)
const isRateLimitError = (error: any): boolean => {
  return error?.response?.status === 429 ||
    (error?.message && error.message.includes('Too Many Requests')) ||
    (error?.response?.data?.error && error.response?.data?.error.includes('Too Many Requests'));
};

/**
 * Service class for fitness-related API calls
 */
class FitnessService {
  /**
   * Check Garmin connection status
   * @returns Connection status
   */
  async checkGarminConnectionStatus(): Promise<GarminConnectionStatus> {
    try {
      console.log('Checking Garmin connection status from fitness service');
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/fitness/garmin/status?_=${timestamp}`);
      console.log('Raw connection status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking Garmin connection:', error);
      return { connected: false };
    }
  }

  /**
   * Connect to Garmin account
   * @param credentials Garmin credentials
   * @returns Connection result
   */
  async connectGarminAccount(credentials: GarminCredentials): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/connect', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Error connecting Garmin account:', error);

      // Check if this is a rate limit error
      if (isRateLimitError(error)) {
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Garmin API rate limit reached. Please try again later.'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || 'Failed to connect Garmin account'
      };
    }
  }

  /**
   * Disconnect from Garmin account
   * @returns Disconnection result
   */
  async disconnectGarminAccount(): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/disconnect');
      return response.data;
    } catch (error: any) {
      console.error('Error disconnecting Garmin account:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to disconnect Garmin account'
      };
    }
  }

  /**
   * Get daily summary for a specific date
   * Internal function called by getRefreshedGarminSummary
   * @param date Date (YYYY-MM-DD)
   * @param forceRefresh Whether to force refresh data from Garmin API
   * @returns Daily summary or error object
   */
  private async _getGarminDailySummaryInternal(date: string, forceRefresh?: boolean): Promise<GarminDailySummary | null | { error: string; message: string }> {
    try {
      const params = forceRefresh ? { forceRefresh: 'true' } : {};
      const url = `/fitness/garmin/daily/${date}`;
      // Add timestamp cache buster only if forcing refresh
      const cacheBuster = forceRefresh ? `?_=${new Date().getTime()}` : '';
      console.log(`[FitnessService] Calling API endpoint: ${api.defaults.baseURL}${url}${cacheBuster} with forceRefresh=${forceRefresh}`);
      const response = await api.get(`${url}${cacheBuster}`, { params });
      console.log(`[FitnessService] API response for ${date} (forceRefresh=${forceRefresh}):`, response.data);
      // Ensure empty data is returned as null for consistency
      if (response.data && Object.keys(response.data).length === 0) {
        console.log(`[FitnessService] Empty object received for ${date}, treating as null.`);
        return null;
      }
      return response.data as GarminDailySummary;
    } catch (error: any) {
      console.error(`[FitnessService] Error getting Garmin daily summary for ${date} (forceRefresh=${forceRefresh}):`, error);
      if (error.response?.status === 429 || error.response?.data?.error === 'RATE_LIMIT') {
        console.warn(`[FitnessService] Rate limit hit for ${date} (forceRefresh=${forceRefresh})`);
        return {
          error: 'RATE_LIMIT',
          message: error.response?.data?.message || 'Garmin API rate limit reached. Please try again later.'
        };
      }
      // Return the full error object for better handling upstream
      return { error: 'FETCH_FAILED', message: error.message || 'Failed to fetch summary' };
    }
  }

  /**
   * Gets the Garmin daily summary, checking client-side cache timestamp first.
   * Fetches live data if cache is older than 15 minutes, otherwise uses backend cache.
   * Includes fallback to backend cache if live fetch fails.
   * @param date Date (YYYY-MM-DD)
   * @returns RefreshedSummaryResult object
   */
  async getRefreshedGarminSummary(date: string): Promise<RefreshedSummaryResult> {
    let lastFetchTimestampStr: string | null = null;
    let minutesSinceLastFetch: number | null = null;
    const now = new Date();

    try {
      lastFetchTimestampStr = await AsyncStorage.getItem(LAST_LIVE_FETCH_KEY);
      if (lastFetchTimestampStr) {
        const lastFetchTime = new Date(parseInt(lastFetchTimestampStr, 10));
        minutesSinceLastFetch = differenceInMinutes(now, lastFetchTime);
        console.log(`[FitnessService] Last live fetch for Garmin was ${minutesSinceLastFetch} minutes ago.`);
      } else {
        console.log('[FitnessService] No previous Garmin live fetch timestamp found.');
      }
    } catch (e) {
      console.error('[FitnessService] Error reading Garmin timestamp from AsyncStorage:', e);
      // Proceed as if no timestamp exists
    }

    const shouldForceRefresh = minutesSinceLastFetch === null || minutesSinceLastFetch >= CACHE_DURATION_MINUTES;

    if (shouldForceRefresh) {
      console.log('[FitnessService] Attempting LIVE fetch (cache expired or missing).');
      const liveResult = await this._getGarminDailySummaryInternal(date, true);

      // Check if the result is an error object
      if (liveResult && typeof liveResult === 'object' && 'error' in liveResult) {
        console.warn('[FitnessService] Live fetch failed. Attempting CACHE fallback.', liveResult);
        const fallbackResult = await this._getGarminDailySummaryInternal(date, false);

        if (fallbackResult && typeof fallbackResult === 'object' && 'error' in fallbackResult) {
          // Both live and cache failed
          return { summary: null, error: liveResult, source: 'cache-fallback' }; // Return original live error
        }
        // Cache fallback succeeded
        return { summary: fallbackResult as GarminDailySummary | null, error: liveResult, source: 'cache-fallback' }; // Return original live error

      } else if (liveResult) {
        // Live fetch succeeded
        try {
          await AsyncStorage.setItem(LAST_LIVE_FETCH_KEY, now.getTime().toString());
          console.log('[FitnessService] Successfully updated live fetch timestamp.');
        } catch (e) {
          console.error('[FitnessService] Error saving Garmin timestamp to AsyncStorage:', e);
        }
        return { summary: liveResult as GarminDailySummary, error: null, source: 'live' };
      } else {
        // Live fetch returned null (e.g., no data for the day yet)
        console.log('[FitnessService] Live fetch returned null/no data.');
         try {
          await AsyncStorage.setItem(LAST_LIVE_FETCH_KEY, now.getTime().toString());
           console.log('[FitnessService] Successfully updated live fetch timestamp even though data was null.');
         } catch (e) {
           console.error('[FitnessService] Error saving Garmin timestamp to AsyncStorage:', e);
         }
        return { summary: null, error: null, source: 'live' };
      }
    } else {
      console.log('[FitnessService] Using CACHED data (timestamp is fresh).');
      const cachedResult = await this._getGarminDailySummaryInternal(date, false);

      if (cachedResult && typeof cachedResult === 'object' && 'error' in cachedResult) {
        // Cache fetch failed
        return { summary: null, error: cachedResult, source: 'cache' };
      }
      // Cache fetch succeeded or returned null
      return { summary: cachedResult as GarminDailySummary | null, error: null, source: 'cache' };
    }
  }

  /**
   * Manually forces a refresh from the Garmin API, bypassing client-side cache check.
   * Updates the last fetch timestamp on success.
   * @param date Date (YYYY-MM-DD)
   * @returns Object containing summary or error
   */
  async forceRefreshGarminSummary(date: string): Promise<{ summary: GarminDailySummary | null; error: any | null }> {
    console.log(`[FitnessService] Manual force refresh requested for ${date}`);
    const now = new Date();

    const result = await this._getGarminDailySummaryInternal(date, true);

    // Check if the result is an error object
    if (result && typeof result === 'object' && 'error' in result) {
      console.warn('[FitnessService] Manual force refresh failed:', result);
      return { summary: null, error: result };
    } else if (result) {
      // Manual force refresh succeeded, update timestamp
      try {
        await AsyncStorage.setItem(LAST_LIVE_FETCH_KEY, now.getTime().toString());
        console.log('[FitnessService] Successfully updated live fetch timestamp after manual refresh.');
      } catch (e) {
        console.error('[FitnessService] Error saving Garmin timestamp to AsyncStorage after manual refresh:', e);
      }
      return { summary: result as GarminDailySummary, error: null };
    } else {
      // Manual force refresh returned null (e.g., no data for the day yet)
      console.log('[FitnessService] Manual force refresh returned null/no data.');
      try {
        await AsyncStorage.setItem(LAST_LIVE_FETCH_KEY, now.getTime().toString());
        console.log('[FitnessService] Successfully updated live fetch timestamp after manual refresh (null data).');
      } catch (e) {
        console.error('[FitnessService] Error saving Garmin timestamp to AsyncStorage after manual refresh:', e);
      }
      return { summary: null, error: null };
    }
  }

  /**
   * Get daily summaries for a date range
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD) (optional)
   * @returns List of daily summaries
   */
  async getGarminDailySummaries(
    startDate: string,
    endDate?: string
  ): Promise<GarminDailySummary[]> {
    try {
      const params = { startDate, endDate };
      const response = await api.get('/fitness/garmin/daily', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting Garmin daily summaries:', error);
      return [];
    }
  }

  /**
   * Update Garmin account credentials
   * @param credentials Garmin Connect credentials
   * @returns Update result
   */
  async updateGarminCredentials(credentials: GarminCredentials): Promise<SyncResult> {
    try {
      const response = await api.put('/fitness/garmin/credentials', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Error updating Garmin credentials:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update Garmin credentials'
      };
    }
  }

  /**
   * Test Garmin connection
   * @returns Connection test result
   */
  async testGarminConnection(): Promise<SyncResult> {
    try {
      const response = await api.get('/fitness/garmin/test');
      return response.data;
    } catch (error: any) {
      console.error('Error testing Garmin connection:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to test Garmin connection'
      };
    }
  }

  /**
   * Get background sync status
   * @returns Sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const response = await api.get('/fitness/garmin/sync/status');
      return response.data;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        active: false,
        interval: 15,
        nextRun: 'Not scheduled'
      };
    }
  }

  /**
   * Start background sync with specified interval
   * @param intervalMinutes Sync interval in minutes
   * @returns Operation result
   */
  async startBackgroundSync(intervalMinutes?: number): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/sync/start', { intervalMinutes });
      return response.data;
    } catch (error: any) {
      console.error('Error starting background sync:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to start background sync'
      };
    }
  }

  /**
   * Stop background sync
   * @returns Operation result
   */
  async stopBackgroundSync(): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/sync/stop');
      return response.data;
    } catch (error: any) {
      console.error('Error stopping background sync:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to stop background sync'
      };
    }
  }

  /**
   * Update background sync interval
   * @param intervalMinutes New interval in minutes
   * @returns Operation result
   */
  async updateSyncInterval(intervalMinutes: number): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/sync/update-interval', { intervalMinutes });
      return response.data;
    } catch (error: any) {
      console.error('Error updating sync interval:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update sync interval'
      };
    }
  }

  /**
   * Trigger an immediate sync for all users
   * @returns Operation result
   */
  async triggerManualSync(): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/sync/now');
      return response.data;
    } catch (error: any) {
      console.error('Error triggering manual sync:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to trigger manual sync'
      };
    }
  }

  /**
   * Sync data with Garmin
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD) (optional)
   * @param forceRefresh Whether to force refresh data from Garmin API
   * @returns Sync result
   */
  async syncGarminData(startDate: string, endDate?: string, forceRefresh?: boolean): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/sync', {
        startDate,
        endDate,
        forceRefresh
      });
      return response.data;
    } catch (error: any) {
      console.error('Error syncing with Garmin:', error);

      // Check if this is a rate limit error
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Garmin API rate limit reached. Please try again later.'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || 'Failed to sync with Garmin'
      };
    }
  }

  /**
   * Get the development mode status for Garmin API access
   * @returns Development mode status
   */
  async getDevModeStatus(): Promise<DevModeStatus> {
    try {
      const response = await api.get('/fitness/garmin/dev-mode-status');
      return response.data;
    } catch (error) {
      console.error('Error getting dev mode status:', error);
      return {
        enabled: false,
        mode: 'unknown'
      };
    }
  }

  /**
   * Toggle Garmin API access in development mode
   * @param enabled Whether to enable or disable API access
   * @returns Toggle result
   */
  async toggleDevModeApiAccess(enabled: boolean): Promise<any> {
    try {
      const response = await api.post('/fitness/garmin/toggle-dev-mode', { enabled });
      return response.data;
    } catch (error) {
      console.error('Error toggling dev mode API access:', error);
      throw error;
    }
  }
}

export const fitnessService = new FitnessService();