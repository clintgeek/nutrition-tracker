import { apiService } from './apiService';

export interface FoodLog {
  id: number;
  user_id: number;
  food_item_id: number;
  food_name: string;
  serving_size: number;
  servings: number;
  calories: number | null;
  calories_per_serving: number | null;
  total_calories: number | null;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
  meal_type: string;
}

class LogService {
  async getRecentLogs(limit: number = 5): Promise<FoodLog[]> {
    try {
      // Get logs with food details in a single query
      const response = await apiService.get<any[]>(`/logs/recent?limit=${limit}`);

      // Transform the response to handle field name differences
      return response.map(log => {
        // Parse servings as a number
        const servings = parseFloat(log.servings || '1');

        // Try all possible sources for calories
        let caloriesPerServing = null;

        // Check for calories_per_serving first (this is what LogScreen uses)
        if (typeof log.calories_per_serving === 'number' || typeof log.calories_per_serving === 'string') {
          const parsed = parseFloat(log.calories_per_serving);
          if (!isNaN(parsed) && parsed > 0) {
            caloriesPerServing = parsed;
          }
        }

        // For food items from the database, they might have a different structure
        if (caloriesPerServing === null && log.calories && servings > 0) {
          const parsed = parseFloat(log.calories) / servings;
          if (!isNaN(parsed) && parsed > 0) {
            caloriesPerServing = parsed;
          }
        }

        // If we have values from the LogScreen format
        if (caloriesPerServing === null && (log.protein_grams || log.carbs_grams || log.fat_grams)) {
          // This is likely from the foodLogService format - check for the proper field
          if (log.calories_per_serving) {
            const parsed = parseFloat(log.calories_per_serving);
            if (!isNaN(parsed) && parsed > 0) {
              caloriesPerServing = parsed;
            }
          }
        }

        // Try some additional fields that might exist
        if (caloriesPerServing === null && log.nutrition && log.nutrition.calories) {
          const parsed = parseFloat(log.nutrition.calories);
          if (!isNaN(parsed) && parsed > 0) {
            caloriesPerServing = parsed;
          }
        }

        // Calculate total calories based on servings
        const totalCalories = caloriesPerServing !== null ? Math.round(servings * caloriesPerServing) : null;

        return {
          id: log.id,
          user_id: log.user_id,
          food_item_id: log.food_item_id,
          food_name: log.food_name || 'Unknown food',
          serving_size: servings,
          servings: servings,
          calories: totalCalories,
          calories_per_serving: caloriesPerServing,
          total_calories: totalCalories,
          protein: log.protein_grams || 0,
          carbs: log.carbs_grams || 0,
          fat: log.fat_grams || 0,
          created_at: log.created_at,
          log_date: log.log_date,
          meal_type: log.meal_type
        };
      });
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  }

  async getLogs(date?: string): Promise<FoodLog[]> {
    try {
      const endpoint = date ? `/logs?date=${date}` : '/logs';
      const response = await apiService.get<any[]>(endpoint);

      // Transform the response to handle field name differences
      return response.map(log => ({
        id: log.id,
        user_id: log.user_id,
        food_item_id: log.food_item_id,
        food_name: log.food_name || 'Unknown food',
        serving_size: parseFloat(log.serving_size || 0),
        servings: parseFloat(log.servings || 0),
        calories: parseFloat(log.calories || 0),
        calories_per_serving: parseFloat(log.calories_per_serving || 0),
        total_calories: parseFloat(log.calories || 0) || (parseFloat(log.calories_per_serving || 0) * parseFloat(log.servings || 0)),
        protein: parseFloat(log.protein || 0),
        carbs: parseFloat(log.carbs || 0),
        fat: parseFloat(log.fat || 0),
        created_at: log.created_at,
        meal_type: log.meal_type
      }));
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  async addLog(logData: Partial<FoodLog>): Promise<FoodLog> {
    try {
      const response = await apiService.post<any>('/logs', logData);

      // Transform the response
      return {
        id: response.id,
        user_id: response.user_id,
        food_item_id: response.food_item_id,
        food_name: response.food_name || 'Unknown food',
        serving_size: parseFloat(response.serving_size || 0),
        servings: parseFloat(response.servings || 0),
        calories: parseFloat(response.calories || 0),
        calories_per_serving: parseFloat(response.calories_per_serving || 0),
        total_calories: parseFloat(response.calories || 0) || (parseFloat(response.calories_per_serving || 0) * parseFloat(response.servings || 0)),
        protein: parseFloat(response.protein || 0),
        carbs: parseFloat(response.carbs || 0),
        fat: parseFloat(response.fat || 0),
        created_at: response.created_at,
        meal_type: response.meal_type
      };
    } catch (error) {
      console.error('Error adding log:', error);
      throw error;
    }
  }

  async updateLog(id: number, logData: Partial<FoodLog>): Promise<FoodLog> {
    try {
      const response = await apiService.put<any>(`/logs/${id}`, logData);

      // Transform the response
      return {
        id: response.id,
        user_id: response.user_id,
        food_item_id: response.food_item_id,
        food_name: response.food_name || 'Unknown food',
        serving_size: parseFloat(response.serving_size || 0),
        servings: parseFloat(response.servings || 0),
        calories: parseFloat(response.calories || 0),
        calories_per_serving: parseFloat(response.calories_per_serving || 0),
        total_calories: parseFloat(response.calories || 0) || (parseFloat(response.calories_per_serving || 0) * parseFloat(response.servings || 0)),
        protein: parseFloat(response.protein || 0),
        carbs: parseFloat(response.carbs || 0),
        fat: parseFloat(response.fat || 0),
        created_at: response.created_at,
        meal_type: response.meal_type
      };
    } catch (error) {
      console.error('Error updating log:', error);
      throw error;
    }
  }

  async deleteLog(id: number): Promise<void> {
    try {
      await apiService.delete<void>(`/logs/${id}`);
    } catch (error) {
      console.error('Error deleting log:', error);
      throw error;
    }
  }
}

export const logService = new LogService();