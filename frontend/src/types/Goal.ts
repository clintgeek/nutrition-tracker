export interface Goal {
  id: string;
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  startDate: string;
  endDate?: string; // If null, it's the current active goal
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
}

export interface GoalProgress {
  date: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  caloriesGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  caloriesPercentage: number;
  proteinPercentage: number;
  carbsPercentage: number;
  fatPercentage: number;
}