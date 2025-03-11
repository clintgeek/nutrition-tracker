-- Create nutrition_goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS nutrition_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    daily_calorie_target INTEGER NOT NULL,
    protein_target_grams INTEGER,
    carbs_target_grams INTEGER,
    fat_target_grams INTEGER,
    start_date DATE,
    sync_id VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);

-- Create index on sync_id for faster sync operations
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);

-- Create index on start_date for date range queries
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_start_date ON nutrition_goals(start_date);

-- Ensure start_date column exists (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_goals' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE nutrition_goals ADD COLUMN start_date DATE;
        UPDATE nutrition_goals SET start_date = CURRENT_DATE WHERE start_date IS NULL;
    END IF;
END $$;