import { Food } from './Food';

export interface FoodLog {
  id: string;
  user_id: string;
  food: Food;
  serving_size: number;
  calories: number;
  created_at: string;
  updated_at: string;
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