import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { FoodItem } from './foodService';

// Food log interface
export interface FoodLog {
  id?: number;
  food_item_id: number;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  sync_id: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  // Additional fields from join
  food_name?: string;
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  serving_size?: string;
  serving_unit?: string;
}

// Daily summary interface
export interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_items: number;
}

// Storage keys
const PENDING_LOGS_KEY = '@NutritionTracker:pendingLogs';
const OFFLINE_LOGS_KEY = '@NutritionTracker:offlineLogs';

// Export individual functions for direct imports
export const getFoodLogsByDate = async (date: string): Promise<FoodLog[]> => {
  return foodLogService.getLogs(date);
};

export const deleteFoodLog = async (id: number): Promise<void> => {
  return foodLogService.deleteLog(id);
};

// Food log service
export const foodLogService = {
  // Get logs for a specific date
  getLogs: async (date: string): Promise<FoodLog[]> => {
    try {
      // Try to get logs from API
      const apiLogs = await apiService.get<{ logs: FoodLog[] }>(`/logs?date=${date}`).then((response) => response.logs);

      // Get offline logs
      const offlineLogs = await foodLogService.getOfflineLogs(date);

      // Combine logs
      return [...apiLogs, ...offlineLogs];
    } catch (error) {
      // If API call fails, return offline logs
      return foodLogService.getOfflineLogs(date);
    }
  },

  // Get logs for a date range
  getLogSummary: async (startDate: string, endDate: string): Promise<{ logs_by_date: Record<string, FoodLog[]>; summaries: Record<string, DailySummary> }> => {
    try {
      // Try to get logs from API
      return apiService.get<{ logs_by_date: Record<string, FoodLog[]>; summaries: Record<string, DailySummary> }>(
        `/logs/summary?start_date=${startDate}&end_date=${endDate}`
      );
    } catch (error) {
      // If API call fails, return empty data
      return { logs_by_date: {}, summaries: {} };
    }
  },

  // Get daily summary
  getDailySummary: async (date: string): Promise<DailySummary> => {
    try {
      // Try to get summary from API
      return apiService.get<{ summary: DailySummary }>(`/logs/daily-summary?date=${date}`).then((response) => response.summary);
    } catch (error) {
      // If API call fails, calculate summary from offline logs
      const logs = await foodLogService.getOfflineLogs(date);

      return logs.reduce(
        (summary, log) => {
          const calories = (log.calories_per_serving || 0) * log.servings;
          const protein = (log.protein_grams || 0) * log.servings;
          const carbs = (log.carbs_grams || 0) * log.servings;
          const fat = (log.fat_grams || 0) * log.servings;

          return {
            total_calories: summary.total_calories + calories,
            total_protein: summary.total_protein + protein,
            total_carbs: summary.total_carbs + carbs,
            total_fat: summary.total_fat + fat,
            total_items: summary.total_items + 1,
          };
        },
        { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, total_items: 0 }
      );
    }
  },

  // Create a new food log
  createLog: async (logData: Omit<FoodLog, 'id' | 'sync_id' | 'created_at' | 'updated_at'> & { food_item?: any }): Promise<FoodLog> => {
    // Generate sync ID
    const syncId = uuid.v4() as string;

    try {
      // Try to create log via API
      const log = await apiService.post<{ message: string; log: FoodLog }>('/logs', {
        ...logData,
        sync_id: syncId,
        food_item: logData.food_item ? {
          name: logData.food_item.name,
          calories_per_serving: logData.food_item.calories || logData.food_item.calories_per_serving,
          protein_grams: logData.food_item.protein || logData.food_item.protein_grams,
          carbs_grams: logData.food_item.carbs || logData.food_item.carbs_grams,
          fat_grams: logData.food_item.fat || logData.food_item.fat_grams,
          serving_size: logData.food_item.serving_size || 1,
          serving_unit: logData.food_item.serving_unit || 'serving'
        } : undefined,
        // Only include food_item_id if it's provided and food_item is not provided
        ...(logData.food_item_id && !logData.food_item ? { food_item_id: logData.food_item_id } : {})
      }).then((response) => response.log);

      return log;
    } catch (error) {
      // If API call fails, save log offline
      const offlineLog: FoodLog = {
        ...logData,
        sync_id: syncId,
        is_deleted: false,
      };

      await foodLogService.saveOfflineLog(offlineLog);

      return offlineLog;
    }
  },

  // Update a food log
  updateLog: async (id: number, logData: Partial<FoodLog>): Promise<FoodLog> => {
    try {
      // Try to update log via API
      return apiService.put<{ message: string; log: FoodLog }>(`/logs/${id}`, logData).then((response) => response.log);
    } catch (error) {
      // If API call fails, mark log for update
      await foodLogService.markLogForUpdate(id, logData);

      // Return updated log
      return { ...logData, id } as FoodLog;
    }
  },

  // Delete a food log
  deleteLog: async (id: number): Promise<void> => {
    try {
      // Try to delete log via API
      await apiService.delete<{ message: string }>(`/logs/${id}`);

      // Remove from offline storage regardless of API success
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
      if (offlineLogsJson) {
        const offlineLogs: FoodLog[] = JSON.parse(offlineLogsJson);
        // Filter out the log by either id or sync_id
        const updatedLogs = offlineLogs.filter(log => {
          if (log.id === id) return false;
          // If the log has no id but matches the sync_id of a deleted log, remove it
          const deletedLog = offlineLogs.find(l => l.id === id);
          if (deletedLog && log.sync_id === deletedLog.sync_id) return false;
          return true;
        });
        await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(updatedLogs));
      }

      // Remove from pending changes
      const pendingLogsJson = await AsyncStorage.getItem(PENDING_LOGS_KEY);
      if (pendingLogsJson) {
        const pendingLogs: FoodLog[] = JSON.parse(pendingLogsJson);
        // Filter out the log by either id or sync_id
        const updatedPendingLogs = pendingLogs.filter(log => {
          if (log.id === id) return false;
          // If the log has no id but matches the sync_id of a deleted log, remove it
          const deletedLog = pendingLogs.find(l => l.id === id);
          if (deletedLog && log.sync_id === deletedLog.sync_id) return false;
          return true;
        });
        await AsyncStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(updatedPendingLogs));
      }
    } catch (error) {
      // If API call fails, still try to remove from local storage
      try {
        const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
        if (offlineLogsJson) {
          const offlineLogs: FoodLog[] = JSON.parse(offlineLogsJson);
          // Filter out the log by either id or sync_id
          const updatedLogs = offlineLogs.filter(log => {
            if (log.id === id) return false;
            // If the log has no id but matches the sync_id of a deleted log, remove it
            const deletedLog = offlineLogs.find(l => l.id === id);
            if (deletedLog && log.sync_id === deletedLog.sync_id) return false;
            return true;
          });
          await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(updatedLogs));
        }

        const pendingLogsJson = await AsyncStorage.getItem(PENDING_LOGS_KEY);
        if (pendingLogsJson) {
          const pendingLogs: FoodLog[] = JSON.parse(pendingLogsJson);
          // Filter out the log by either id or sync_id
          const updatedPendingLogs = pendingLogs.filter(log => {
            if (log.id === id) return false;
            // If the log has no id but matches the sync_id of a deleted log, remove it
            const deletedLog = pendingLogs.find(l => l.id === id);
            if (deletedLog && log.sync_id === deletedLog.sync_id) return false;
            return true;
          });
          await AsyncStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(updatedPendingLogs));
        }
      } catch (storageError) {
        console.error('Error removing log from storage:', storageError);
      }
    }
  },

  // Get offline logs for a specific date
  getOfflineLogs: async (date: string): Promise<FoodLog[]> => {
    try {
      // Get offline logs from storage
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);

      if (!offlineLogsJson) {
        return [];
      }

      const offlineLogs: FoodLog[] = JSON.parse(offlineLogsJson);

      // Filter logs by date
      return offlineLogs.filter((log) => log.log_date === date && !log.is_deleted);
    } catch (error) {
      console.error('Error getting offline logs:', error);
      return [];
    }
  },

  // Save offline log
  saveOfflineLog: async (log: FoodLog): Promise<void> => {
    try {
      // Get existing offline logs
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
      const offlineLogs: FoodLog[] = offlineLogsJson ? JSON.parse(offlineLogsJson) : [];

      // Add new log
      offlineLogs.push(log);

      // Save updated logs
      await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(offlineLogs));

      // Add to pending changes
      await foodLogService.addToPendingChanges(log);
    } catch (error) {
      console.error('Error saving offline log:', error);
    }
  },

  // Mark log for update
  markLogForUpdate: async (id: number, logData: Partial<FoodLog>): Promise<void> => {
    try {
      // Get existing offline logs
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
      const offlineLogs: FoodLog[] = offlineLogsJson ? JSON.parse(offlineLogsJson) : [];

      // Find log by ID
      const logIndex = offlineLogs.findIndex((log) => log.id === id);

      if (logIndex !== -1) {
        // Update log
        offlineLogs[logIndex] = { ...offlineLogs[logIndex], ...logData };

        // Save updated logs
        await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(offlineLogs));
      }

      // Add to pending changes
      await foodLogService.addToPendingChanges({ id, ...logData } as FoodLog);
    } catch (error) {
      console.error('Error marking log for update:', error);
    }
  },

  // Mark log for deletion
  markLogForDeletion: async (id: number): Promise<void> => {
    try {
      // Get existing offline logs
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
      const offlineLogs: FoodLog[] = offlineLogsJson ? JSON.parse(offlineLogsJson) : [];

      // Find log by ID
      const logIndex = offlineLogs.findIndex((log) => log.id === id);

      if (logIndex !== -1) {
        // Mark log as deleted
        offlineLogs[logIndex].is_deleted = true;

        // Save updated logs
        await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(offlineLogs));
      }

      // Add to pending changes
      await foodLogService.addToPendingChanges({ id, is_deleted: true } as FoodLog);
    } catch (error) {
      console.error('Error marking log for deletion:', error);
    }
  },

  // Add to pending changes
  addToPendingChanges: async (log: FoodLog): Promise<void> => {
    try {
      // Get existing pending changes
      const pendingLogsJson = await AsyncStorage.getItem(PENDING_LOGS_KEY);
      const pendingLogs: FoodLog[] = pendingLogsJson ? JSON.parse(pendingLogsJson) : [];

      // Check if log already exists in pending changes
      const logIndex = pendingLogs.findIndex((pendingLog) =>
        (pendingLog.id && pendingLog.id === log.id) ||
        (pendingLog.sync_id && pendingLog.sync_id === log.sync_id)
      );

      if (logIndex !== -1) {
        // Update existing log
        pendingLogs[logIndex] = { ...pendingLogs[logIndex], ...log };
      } else {
        // Add new log
        pendingLogs.push(log);
      }

      // Save updated pending changes
      await AsyncStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pendingLogs));
    } catch (error) {
      console.error('Error adding to pending changes:', error);
    }
  },

  // Get pending changes
  getPendingChanges: async (): Promise<FoodLog[]> => {
    try {
      // Get pending changes from storage
      const pendingLogsJson = await AsyncStorage.getItem(PENDING_LOGS_KEY);

      if (!pendingLogsJson) {
        return [];
      }

      return JSON.parse(pendingLogsJson);
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  },

  // Process synced logs
  processSyncedLogs: async (logs: FoodLog[]): Promise<void> => {
    try {
      // Get existing offline logs
      const offlineLogsJson = await AsyncStorage.getItem(OFFLINE_LOGS_KEY);
      const offlineLogs: FoodLog[] = offlineLogsJson ? JSON.parse(offlineLogsJson) : [];

      // Process each synced log
      for (const log of logs) {
        // Find log by sync ID
        const logIndex = offlineLogs.findIndex((offlineLog) => offlineLog.sync_id === log.sync_id);

        if (logIndex !== -1) {
          // Update existing log
          offlineLogs[logIndex] = { ...offlineLogs[logIndex], ...log };
        } else {
          // Add new log
          offlineLogs.push(log);
        }
      }

      // Save updated logs
      await AsyncStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(offlineLogs));
    } catch (error) {
      console.error('Error processing synced logs:', error);
    }
  },

  // Mark logs as synced
  markAsSynced: async (syncedLogs: FoodLog[], deletedIds: number[]): Promise<void> => {
    try {
      // Get pending changes
      const pendingLogsJson = await AsyncStorage.getItem(PENDING_LOGS_KEY);
      let pendingLogs: FoodLog[] = pendingLogsJson ? JSON.parse(pendingLogsJson) : [];

      // Remove synced logs from pending changes
      pendingLogs = pendingLogs.filter((pendingLog) => {
        // Check if log is in synced logs
        const isSynced = syncedLogs.some((syncedLog) =>
          (syncedLog.id && syncedLog.id === pendingLog.id) ||
          (syncedLog.sync_id && syncedLog.sync_id === pendingLog.sync_id)
        );

        // Check if log is in deleted IDs
        const isDeleted = pendingLog.id && deletedIds.includes(pendingLog.id);

        // Keep log if not synced and not deleted
        return !isSynced && !isDeleted;
      });

      // Save updated pending changes
      await AsyncStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pendingLogs));
    } catch (error) {
      console.error('Error marking logs as synced:', error);
    }
  },
};