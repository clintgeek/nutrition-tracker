import { api } from './api';

export interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  created_at: string;
  updated_at: string;
  sync_id: string;
  is_deleted: boolean;
}

export const mealPlanService = {
  async getMealPlansByDate(date: string): Promise<MealPlan[]> {
    const response = await api.get(`/meal-plans/date/${date}`);
    return response.data;
  },

  async getMealPlansByDateRange(startDate: string, endDate: string): Promise<MealPlan[]> {
    const response = await api.get('/meal-plans/range', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async createMealPlan(mealPlan: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_id' | 'is_deleted'>): Promise<MealPlan> {
    const response = await api.post('/meal-plans', mealPlan);
    return response.data;
  },

  async updateMealPlan(id: number, mealPlan: Partial<MealPlan>): Promise<MealPlan> {
    const response = await api.put(`/meal-plans/${id}`, mealPlan);
    return response.data;
  },

  async deleteMealPlan(id: number): Promise<void> {
    await api.delete(`/meal-plans/${id}`);
  }
};