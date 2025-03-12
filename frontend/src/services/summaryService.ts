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

      // Add timeout to prevent hanging requests
      const response = await Promise.race([
        apiService.get<{ summary: DailySummary }>(endpoint),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
        )
      ]) as { summary: DailySummary };

      console.log('Daily summary response:', response);

      // Check if the response has the expected structure
      if (response && response.summary) {
        return response.summary;
      } else {
        console.warn('Invalid summary response format:', response);
        return emptySummary;
      }
    } catch (error: any) {
      console.error('Error fetching daily summary:', error);

      // Log more details about the error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }

      // Return empty summary instead of throwing the error
      return emptySummary;
    }
  },
};