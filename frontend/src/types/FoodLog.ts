import { Food } from './Food';

export interface FoodLog {
  id?: number;
  user_id?: string | number;
  food_item_id?: number;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  sync_id?: string;
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

export interface FoodLogSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealBreakdown: {
    breakfast: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    lunch: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    dinner: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    snack: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}