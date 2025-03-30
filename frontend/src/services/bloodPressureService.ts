import { apiService } from './apiService';
import { format } from 'date-fns';

export interface BloodPressureLog {
  id: number;
  user_id: number;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  log_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureLogInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  log_date: string;
  notes?: string;
}

const bloodPressureService = {
  // Get all blood pressure logs
  async getBloodPressureLogs(startDate?: string, endDate?: string): Promise<BloodPressureLog[]> {
    let url = '/blood-pressure';
    if (startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    return apiService.get<BloodPressureLog[]>(url);
  },

  // Get latest blood pressure log
  async getLatestBloodPressureLog(): Promise<BloodPressureLog | null> {
    const response = await apiService.get<{ log: BloodPressureLog | null }>('/blood-pressure/latest');
    return response.log;
  },

  // Add a new blood pressure log
  async addBloodPressureLog(logData: BloodPressureLogInput): Promise<BloodPressureLog> {
    // Format the date to YYYY-MM-DD
    const formattedData = {
      ...logData,
      log_date: format(new Date(logData.log_date), 'yyyy-MM-dd')
    };
    return apiService.post<BloodPressureLog>('/blood-pressure', formattedData);
  },

  // Update a blood pressure log
  async updateBloodPressureLog(id: number, logData: BloodPressureLogInput): Promise<BloodPressureLog> {
    // Format the date to YYYY-MM-DD
    const formattedData = {
      ...logData,
      log_date: format(new Date(logData.log_date), 'yyyy-MM-dd')
    };
    return apiService.put<BloodPressureLog>(`/blood-pressure/${id}`, formattedData);
  },

  // Delete a blood pressure log
  async deleteBloodPressureLog(id: number): Promise<void> {
    await apiService.delete<void>(`/blood-pressure/${id}`);
  },

  async generateReport(): Promise<Blob> {
    const response = await apiService.get<Blob>('/blood-pressure/report', {
      responseType: 'blob'
    });
    return response;
  }
};

export default bloodPressureService;