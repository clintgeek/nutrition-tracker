import { Food } from './Food';

export interface FoodLog {
  id: string;
  userId: string;
  food: Food;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servingSize: number;
  servingUnit: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
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