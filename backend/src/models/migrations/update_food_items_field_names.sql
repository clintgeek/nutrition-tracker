-- Rename columns to match frontend field names
ALTER TABLE food_items
  RENAME COLUMN calories_per_serving TO calories;

ALTER TABLE food_items
  RENAME COLUMN protein_grams TO protein;

ALTER TABLE food_items
  RENAME COLUMN carbs_grams TO carbs;

ALTER TABLE food_items
  RENAME COLUMN fat_grams TO fat;

ALTER TABLE food_items
  RENAME COLUMN serving_size TO "servingSize";

ALTER TABLE food_items
  RENAME COLUMN serving_unit TO "servingUnit";

-- Update the food_logs table to match the new field names
ALTER TABLE food_logs
  RENAME COLUMN calories_per_serving TO calories;

ALTER TABLE food_logs
  RENAME COLUMN protein_grams TO protein;

ALTER TABLE food_logs
  RENAME COLUMN carbs_grams TO carbs;

ALTER TABLE food_logs
  RENAME COLUMN fat_grams TO fat;