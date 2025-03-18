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

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Weight service
export const weightService = {
  // Weight Goals
  // -----------

  // Get weight goal
  async getWeightGoal(): Promise<WeightGoal | null> {
    try {
      const response = await apiService.get<{ goal: WeightGoal }>('/weight/goal');
      return response.goal;
    } catch (error) {
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

      // Check if logs exist
      if (!response.logs || response.logs.length === 0) {
        console.log('No weight logs found in API response');
        return [];
      }

      console.log('Raw weight logs from API:', JSON.stringify(response.logs[0]));

      // Transform the response to match our interface
      const transformedLogs: WeightLog[] = response.logs.map(log => ({
        id: log.id,
        weight_value: parseFloat(log.weight || log.weight_value || 0),
        log_date: log.date || log.log_date || '',
        notes: log.notes,
        sync_id: log.sync_id || uuid.v4(),
        created_at: log.created_at,
        updated_at: log.updated_at
      }));

      return transformedLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
    } catch (error) {
      console.error('Error fetching weight logs:', error);
      return [];
    }
  },

  // Get weight logs for a date range
  getWeightLogsForDateRange: async (startDate: Date, endDate: Date): Promise<WeightLog[]> => {
    try {
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

      const response = await apiService.get<{ logs: any[] }>(`/weight/logs/range?start_date=${formattedStartDate}&end_date=${formattedEndDate}`);

      // Check if logs exist
      if (!response.logs || response.logs.length === 0) {
        console.log('No weight logs found in date range API response');
        return [];
      }

      console.log('Raw weight logs from date range API:', JSON.stringify(response.logs[0]));

      // Transform the response to match our interface
      const transformedLogs: WeightLog[] = response.logs.map(log => ({
        id: log.id,
        weight_value: parseFloat(log.weight || log.weight_value || 0),
        log_date: log.date || log.log_date || '',
        notes: log.notes,
        sync_id: log.sync_id || uuid.v4(),
        created_at: log.created_at,
        updated_at: log.updated_at
      }));

      return transformedLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    } catch (error) {
      console.error('Error fetching weight logs for date range:', error);
      return [];
    }
  },

  // Get latest weight log
  getLatestWeightLog: async (): Promise<WeightLog | null> => {
    try {
      const response = await apiService.get<{ log: any }>('/weight/logs/latest');

      if (!response.log) {
        console.log('No latest weight log found in API response');
        return null;
      }

      console.log('Raw latest weight log from API:', JSON.stringify(response.log));

      // Transform the response to match our interface
      const transformedLog: WeightLog = {
        id: response.log.id,
        weight_value: parseFloat(response.log.weight || response.log.weight_value || 0),
        log_date: response.log.date || response.log.log_date || '',
        notes: response.log.notes,
        sync_id: response.log.sync_id || uuid.v4(),
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
      // Send data with the correct field names
      const response = await apiService.post<{ message: string; log: any }>('/weight/logs', {
        weight_value: logData.weight_value,
        log_date: logData.log_date,
        notes: logData.notes,
        sync_id: syncId,
      });

      // Transform the response back to our interface format
      const transformedLog: WeightLog = {
        id: response.log.id,
        weight_value: parseFloat(response.log.weight_value || 0),
        log_date: response.log.log_date || '',
        notes: response.log.notes,
        sync_id: response.log.sync_id || syncId,
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