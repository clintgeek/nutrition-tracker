-- Migrate data from old columns to new columns in nutrition_goals table
UPDATE nutrition_goals
SET
  daily_calorie_target = calories,
  protein_target_grams = protein_grams,
  carbs_target_grams = carbs_grams,
  fat_target_grams = fat_grams
WHERE
  -- Only update records where the new columns are NULL or 0
  (daily_calorie_target IS NULL OR daily_calorie_target = 0) AND
  (protein_target_grams IS NULL OR protein_target_grams = 0) AND
  (carbs_target_grams IS NULL OR carbs_target_grams = 0) AND
  (fat_target_grams IS NULL OR fat_target_grams = 0) AND
  -- And where at least one of the old columns has data
  (calories IS NOT NULL OR protein_grams IS NOT NULL OR carbs_grams IS NOT NULL OR fat_grams IS NOT NULL);

-- Verify the migration
SELECT
  id,
  user_id,
  calories,
  protein_grams,
  carbs_grams,
  fat_grams,
  daily_calorie_target,
  protein_target_grams,
  carbs_target_grams,
  fat_target_grams
FROM nutrition_goals
ORDER BY id DESC
LIMIT 10;