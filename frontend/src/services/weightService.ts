import { apiService } from './apiService';
import uuid from 'react-native-uuid';

// Weight log interface
export interface WeightLog {
  id?: number;
  weight_value: number;
  log_date: string;
  notes?: string;
  sync_id: string;
  created_at?: string;
  updated_at?: string;
}

// Weight goal interface
export interface WeightGoal {
  id?: number;
  target_weight: number;
  start_weight: number;
  start_date: string;
  target_date?: string;
  sync_id: string;
  created_at?: string;
  updated_at?: string;
}

// Weight service
export const weightService = {
  // Weight Goals
  // -----------

  // Get weight goal
  getWeightGoal: async (): Promise<WeightGoal | null> => {
    try {
      const response = await apiService.get<{ goal: WeightGoal }>('/weight/goal');
      return response.goal;
    } catch (error) {
      console.error('Error fetching weight goal:', error);
      return null;
    }
  },

  // Save weight goal
  saveWeightGoal: async (goalData: Omit<WeightGoal, 'id' | 'sync_id' | 'created_at' | 'updated_at'>): Promise<WeightGoal> => {
    const syncId = uuid.v4() as string;
    try {
      const response = await apiService.post<{ message: string; goal: WeightGoal }>('/weight/goal', {
        ...goalData,
        sync_id: syncId,
      });
      return response.goal;
    } catch (error) {
      console.error('Error saving weight goal:', error);
      throw error;
    }
  },

  // Weight Logs
  // -----------

  // Get all weight logs
  getWeightLogs: async (): Promise<WeightLog[]> => {
    try {
      const response = await apiService.get<{ logs: any[] }>('/weight/logs');

      // Transform the response to match our interface
      const transformedLogs: WeightLog[] = response.logs.map(log => ({
        id: log.id,
        weight_value: log.weight || 0,
        log_date: log.date || '',
        notes: log.notes,
        sync_id: log.sync_id,
        created_at: log.created_at,
        updated_at: log.updated_at
      }));

      return transformedLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
    } catch (error) {
      console.error('Error fetching weight logs:', error);
      return [];
    }
  },

  // Get latest weight log
  getLatestWeightLog: async (): Promise<WeightLog | null> => {
    try {
      const response = await apiService.get<{ log: any }>('/weight/logs/latest');

      if (!response.log) return null;

      // Transform the response to match our interface
      const transformedLog: WeightLog = {
        id: response.log.id,
        weight_value: response.log.weight || 0,
        log_date: response.log.date || '',
        notes: response.log.notes,
        sync_id: response.log.sync_id,
        created_at: response.log.created_at,
        updated_at: response.log.updated_at
      };

      return transformedLog;
    } catch (error) {
      console.error('Error fetching latest weight log:', error);
      return null;
    }
  },

  // Add weight log
  addWeightLog: async (logData: Omit<WeightLog, 'id' | 'sync_id' | 'created_at' | 'updated_at'>): Promise<WeightLog> => {
    const syncId = uuid.v4() as string;
    try {
      // Map the field names to what the backend expects
      const response = await apiService.post<{ message: string; log: any }>('/weight/logs', {
        weight: logData.weight_value,
        date: logData.log_date,
        notes: logData.notes,
        sync_id: syncId,
      });

      // Transform the response back to our interface format
      const transformedLog: WeightLog = {
        id: response.log.id,
        weight_value: response.log.weight || 0,
        log_date: response.log.date || '',
        notes: response.log.notes,
        sync_id: response.log.sync_id,
        created_at: response.log.created_at,
        updated_at: response.log.updated_at
      };

      return transformedLog;
    } catch (error) {
      console.error('Error adding weight log:', error);
      throw error;
    }
  },

  // Delete weight log
  deleteWeightLog: async (id: number): Promise<void> => {
    try {
      await apiService.delete<{ message: string }>(`/weight/logs/${id}`);
    } catch (error) {
      console.error('Error deleting weight log:', error);
      throw error;
    }
  },
};

export default weightService;