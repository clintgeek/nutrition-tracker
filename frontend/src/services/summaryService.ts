import { apiService } from './apiService';

// Daily summary interface
export interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_items: number;
}

// Default empty summary
const emptySummary: DailySummary = {
  total_calories: 0,
  total_protein: 0,
  total_carbs: 0,
  total_fat: 0,
  total_items: 0,
};

// Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Summary service
export const summaryService = {
  // Get daily summary for a specific date
  getDailySummary: async (date: Date): Promise<DailySummary> => {
    try {
      // Format date as YYYY-MM-DD for the API
      const formattedDate = formatDate(date);

      // Log the API call for debugging
      console.log('Fetching daily summary for date:', formattedDate);

      // Call the correct API endpoint
      const endpoint = `/logs/daily-summary?date=${formattedDate}`;
      console.log('API endpoint:', endpoint);

      return apiService.get<{ summary: DailySummary }>(endpoint)
        .then((response) => {
          console.log('Daily summary response:', response);
          return response.summary;
        });
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return emptySummary;
    }
  },
};