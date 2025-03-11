-- Add missing columns to nutrition_goals table
ALTER TABLE nutrition_goals
  ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER,
  ADD COLUMN IF NOT EXISTS protein_target_grams INTEGER,
  ADD COLUMN IF NOT EXISTS carbs_target_grams INTEGER,
  ADD COLUMN IF NOT EXISTS fat_target_grams INTEGER;

-- Copy data from existing columns to new columns
UPDATE nutrition_goals
SET
  daily_calorie_target = calories,
  protein_target_grams = protein_grams,
  carbs_target_grams = carbs_grams,
  fat_target_grams = fat_grams;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_date_range ON nutrition_goals(start_date, end_date);