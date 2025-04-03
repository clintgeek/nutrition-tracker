import { api } from './api';
import axios, { AxiosError } from 'axios';

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
 * Interface for Garmin activity
 */
export interface GarminActivity {
  id: number;
  garmin_activity_id: string;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration_seconds: number;
  distance_meters: number;
  calories: number;
  avg_heart_rate: number;
  max_heart_rate: number;
  steps: number;
  elevation_gain: number;
  created_at: string;
  updated_at: string;
  details?: any;
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
   * Connect Garmin account
   * @param credentials Garmin Connect credentials
   * @returns Connection result
   */
  async connectGarminAccount(credentials: GarminCredentials): Promise<SyncResult> {
    try {
      const response = await api.post('/fitness/garmin/connect', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Error connecting Garmin account:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to connect Garmin account'
      };
    }
  }

  /**
   * Disconnect Garmin account
   * @returns Disconnection result
   */
  async disconnectGarminAccount(): Promise<SyncResult> {
    try {
      console.log('Calling disconnect Garmin API endpoint');
      const response = await api.post('/fitness/garmin/disconnect');
      console.log('Disconnect API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error disconnecting Garmin account:', error);

      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }

      return {
        success: false,
        error: error.response?.data?.error || 'Failed to disconnect Garmin account'
      };
    }
  }

  /**
   * Import activities from Garmin
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD) (optional)
   * @returns Import result
   */
  async importGarminActivities(startDate: string, endDate?: string): Promise<SyncResult> {
    try {
      console.log('Importing Garmin activities for date range:', startDate, 'to', endDate);
      const response = await api.post('/fitness/garmin/import', { startDate, endDate });
      console.log('Import response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error importing Garmin activities:', error);

      if (isRateLimitError(error)) {
        console.warn('Garmin API rate limit reached');
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Garmin API rate limit reached. Please try again later.'
        };
      }

      return {
        success: false,
        error: error?.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Sync daily summaries from Garmin
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD) (optional)
   * @returns Sync result
   */
  async syncGarminDailySummaries(startDate: string, endDate?: string): Promise<SyncResult> {
    try {
      console.log('Syncing Garmin daily summaries for date range:', startDate, 'to', endDate);
      const response = await api.post('/fitness/garmin/sync', { startDate, endDate });
      console.log('Sync response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error syncing Garmin daily summaries:', error);

      if (isRateLimitError(error)) {
        console.warn('Garmin API rate limit reached');
        return {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Garmin API rate limit reached. Please try again later.'
        };
      }

      return {
        success: false,
        error: error?.response?.data?.error || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get Garmin activities
   * @param limit Maximum number of activities to return
   * @param offset Offset for pagination
   * @param startDate Start date filter (YYYY-MM-DD) (optional)
   * @param endDate End date filter (YYYY-MM-DD) (optional)
   * @returns List of activities
   */
  async getGarminActivities(
    limit = 20,
    offset = 0,
    startDate?: string,
    endDate?: string
  ): Promise<GarminActivity[]> {
    try {
      const params = { limit, offset, startDate, endDate };
      const response = await api.get('/fitness/garmin/activities', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting Garmin activities:', error);
      return [];
    }
  }

  /**
   * Get activity details
   * @param activityId Garmin activity ID
   * @returns Activity details
   */
  async getGarminActivityDetails(activityId: string): Promise<GarminActivity | null> {
    try {
      const response = await api.get(`/fitness/garmin/activities/${activityId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting Garmin activity details:', error);
      return null;
    }
  }

  /**
   * Get daily summary for a specific date
   * @param date Date (YYYY-MM-DD)
   * @param forceRefresh Whether to force refresh data from Garmin API
   * @returns Daily summary
   */
  async getGarminDailySummary(date: string, forceRefresh?: boolean): Promise<GarminDailySummary | null> {
    try {
      const params = forceRefresh ? { forceRefresh: 'true' } : {};
      const response = await api.get(`/fitness/garmin/daily/${date}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error getting Garmin daily summary:', error);
      return null;
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