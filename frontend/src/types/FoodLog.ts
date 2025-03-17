import { Food } from './Food';

export interface FoodLog {
  id: string;
  user_id: string;
  food: Food;
  food_name?: string;
  food_item_id?: number;
  serving_size: number;
  servings?: number;
  serving_unit?: string;
  calories: number;
  calories_per_serving?: number;
  total_calories?: number;
  created_at: string;
  updated_at: string;
  log_date?: string;
  meal_type: string;
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