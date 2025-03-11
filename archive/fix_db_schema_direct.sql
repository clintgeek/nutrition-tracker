-- First, check if the nutrition_goals table exists and rename it to goals
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'nutrition_goals'
    ) THEN
        -- Rename the table if it exists with the wrong name
        ALTER TABLE nutrition_goals RENAME TO goals;
    END IF;
END $$;

-- If the goals table doesn't exist, create it
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    daily_calorie_target INTEGER,
    protein_target_grams INTEGER,
    carbs_target_grams INTEGER,
    fat_target_grams INTEGER,
    start_date DATE,
    end_date DATE,
    sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rename columns if they exist with different names
DO $$
BEGIN
    -- Check if calories column exists (and daily_calorie_target doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'calories'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'daily_calorie_target'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN calories TO daily_calorie_target;
    END IF;

    -- Check if protein_grams column exists (and protein_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'protein_grams'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'protein_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN protein_grams TO protein_target_grams;
    END IF;

    -- Check if carbs_grams column exists (and carbs_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'carbs_grams'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'carbs_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN carbs_grams TO carbs_target_grams;
    END IF;

    -- Check if fat_grams column exists (and fat_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'fat_grams'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'fat_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN fat_grams TO fat_target_grams;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_sync_id ON goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_goals_date_range ON goals(start_date, end_date);

-- Print the current schema of the goals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'goals'
ORDER BY ordinal_position;