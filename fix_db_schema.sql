-- First, check if the nutrition_goals table exists
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

-- Create the goals table if it doesn't exist
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

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check if daily_calorie_target column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'daily_calorie_target'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN daily_calorie_target INTEGER;
    END IF;

    -- Check if protein_target_grams column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'protein_target_grams'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN protein_target_grams INTEGER;
    END IF;

    -- Check if carbs_target_grams column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'carbs_target_grams'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN carbs_target_grams INTEGER;
    END IF;

    -- Check if fat_target_grams column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'fat_target_grams'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN fat_target_grams INTEGER;
    END IF;

    -- Check if sync_id column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'sync_id'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid();
    END IF;

    -- Check if is_deleted column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'is_deleted'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;

    -- Check if start_date column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'start_date'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN start_date DATE;
    END IF;

    -- Check if end_date column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'end_date'
    ) THEN
        -- Add the column
        ALTER TABLE goals ADD COLUMN end_date DATE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_sync_id ON goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_goals_date_range ON goals(start_date, end_date);

-- If there are any columns with camelCase naming, rename them to snake_case
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

    -- Check if protein column exists (and protein_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'protein'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'protein_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN protein TO protein_target_grams;
    END IF;

    -- Check if carbs column exists (and carbs_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'carbs'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'carbs_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN carbs TO carbs_target_grams;
    END IF;

    -- Check if fat column exists (and fat_target_grams doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'fat'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'fat_target_grams'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN fat TO fat_target_grams;
    END IF;

    -- Check if startDate column exists (and start_date doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'startdate'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'start_date'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN startdate TO start_date;
    END IF;

    -- Check if endDate column exists (and end_date doesn't)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'enddate'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'goals' AND column_name = 'end_date'
    ) THEN
        -- Rename the column
        ALTER TABLE goals RENAME COLUMN enddate TO end_date;
    END IF;
END $$;

-- Print the current schema of the goals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'goals'
ORDER BY ordinal_position;