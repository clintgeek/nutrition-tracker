import { apiService } from './apiService';
import { FoodLog } from './foodLogService';
import { Goal } from './goalService';

// Sync changes interface
interface SyncChanges {
  food_logs: FoodLog[];
  goals: Goal[];
}

// Processed changes interface
interface ProcessedChanges {
  food_logs: {
    created: FoodLog[];
    updated: FoodLog[];
    deleted: number[];
  };
  goals: {
    created: Goal[];
    updated: Goal[];
    deleted: number[];
  };
}

// Server changes interface
interface ServerChanges {
  food_logs: FoodLog[];
  goals: Goal[];
}

// Sync response interface
interface SyncResponse {
  sync_timestamp: string;
  processed_changes: ProcessedChanges;
  server_changes: ServerChanges;
}

// Sync service
export const syncService = {
  // Get sync status
  getSyncStatus: async (deviceId: string): Promise<{ last_sync_timestamp: string | null }> => {
    return apiService.get<{ sync_status: { device_id: string; last_sync_timestamp: string | null } }>(
      `/sync/status?device_id=${deviceId}`
    ).then((response) => ({
      last_sync_timestamp: response.sync_status.last_sync_timestamp,
    }));
  },

  // Sync data
  syncData: async (deviceId: string, lastSyncTimestamp: string | null, changes: SyncChanges): Promise<SyncResponse> => {
    return apiService.post<SyncResponse>('/sync', {
      device_id: deviceId,
      last_sync_timestamp: lastSyncTimestamp,
      changes,
    });
  },
};