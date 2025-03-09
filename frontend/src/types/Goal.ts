export interface Goal {
  id?: number;
  user_id?: number;
  daily_calorie_target: number;
  protein_target_grams?: number;
  carbs_target_grams?: number;
  fat_target_grams?: number;
  start_date?: string;
  end_date?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  sync_id?: string;
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