-- Optimize the nutrition_goals table by ensuring all data is in the new columns
-- and setting up proper constraints

-- First, make sure all data is copied from old columns to new columns
UPDATE nutrition_goals
SET
  daily_calorie_target = COALESCE(daily_calorie_target, calories),
  protein_target_grams = COALESCE(protein_target_grams, protein_grams),
  carbs_target_grams = COALESCE(carbs_target_grams, carbs_grams),
  fat_target_grams = COALESCE(fat_target_grams, fat_grams)
WHERE
  (daily_calorie_target IS NULL AND calories IS NOT NULL) OR
  (protein_target_grams IS NULL AND protein_grams IS NOT NULL) OR
  (carbs_target_grams IS NULL AND carbs_grams IS NOT NULL) OR
  (fat_target_grams IS NULL AND fat_grams IS NOT NULL);

-- Add NOT NULL constraints to the new columns where appropriate
ALTER TABLE nutrition_goals
  ALTER COLUMN daily_calorie_target SET DEFAULT 0,
  ALTER COLUMN protein_target_grams SET DEFAULT 0,
  ALTER COLUMN carbs_target_grams SET DEFAULT 0,
  ALTER COLUMN fat_target_grams SET DEFAULT 0;

-- Add comments to indicate that the old columns are deprecated
COMMENT ON COLUMN nutrition_goals.calories IS 'DEPRECATED: Use daily_calorie_target instead';
COMMENT ON COLUMN nutrition_goals.protein_grams IS 'DEPRECATED: Use protein_target_grams instead';
COMMENT ON COLUMN nutrition_goals.carbs_grams IS 'DEPRECATED: Use carbs_target_grams instead';
COMMENT ON COLUMN nutrition_goals.fat_grams IS 'DEPRECATED: Use fat_target_grams instead';

-- Create a trigger to keep the old and new columns in sync for backward compatibility
CREATE OR REPLACE FUNCTION sync_nutrition_goals_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting or updating new columns, update old columns
  IF TG_OP = 'INSERT' OR NEW.daily_calorie_target IS DISTINCT FROM OLD.daily_calorie_target OR
     NEW.protein_target_grams IS DISTINCT FROM OLD.protein_target_grams OR
     NEW.carbs_target_grams IS DISTINCT FROM OLD.carbs_target_grams OR
     NEW.fat_target_grams IS DISTINCT FROM OLD.fat_target_grams THEN

    NEW.calories := NEW.daily_calorie_target;
    NEW.protein_grams := NEW.protein_target_grams;
    NEW.carbs_grams := NEW.carbs_target_grams;
    NEW.fat_grams := NEW.fat_target_grams;
  END IF;

  -- When updating old columns, update new columns
  IF TG_OP = 'UPDATE' AND (
     NEW.calories IS DISTINCT FROM OLD.calories OR
     NEW.protein_grams IS DISTINCT FROM OLD.protein_grams OR
     NEW.carbs_grams IS DISTINCT FROM OLD.carbs_grams OR
     NEW.fat_grams IS DISTINCT FROM OLD.fat_grams) THEN

    NEW.daily_calorie_target := NEW.calories;
    NEW.protein_target_grams := NEW.protein_grams;
    NEW.carbs_target_grams := NEW.carbs_grams;
    NEW.fat_target_grams := NEW.fat_grams;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS sync_nutrition_goals_columns_trigger ON nutrition_goals;

-- Create the trigger
CREATE TRIGGER sync_nutrition_goals_columns_trigger
BEFORE INSERT OR UPDATE ON nutrition_goals
FOR EACH ROW
EXECUTE FUNCTION sync_nutrition_goals_columns();

-- Verify the changes
SELECT column_name, is_nullable, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'nutrition_goals'
ORDER BY ordinal_position;
