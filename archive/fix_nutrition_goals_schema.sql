-- Fix nutrition_goals table schema
DO $$
BEGIN
    -- Check if the nutrition_goals table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'nutrition_goals'
    ) THEN
        -- Check if daily_calorie_target column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'daily_calorie_target'
        ) THEN
            -- Check if calories column exists (old name)
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'nutrition_goals' AND column_name = 'calories'
            ) THEN
                -- Rename calories to daily_calorie_target
                ALTER TABLE nutrition_goals RENAME COLUMN calories TO daily_calorie_target;
                RAISE NOTICE 'Renamed calories column to daily_calorie_target';
            ELSE
                -- Add daily_calorie_target column
                ALTER TABLE nutrition_goals ADD COLUMN daily_calorie_target INTEGER;
                RAISE NOTICE 'Added daily_calorie_target column';
            END IF;
        END IF;

        -- Check if protein_target_grams column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'protein_target_grams'
        ) THEN
            -- Check if protein_grams column exists (old name)
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'nutrition_goals' AND column_name = 'protein_grams'
            ) THEN
                -- Rename protein_grams to protein_target_grams
                ALTER TABLE nutrition_goals RENAME COLUMN protein_grams TO protein_target_grams;
                RAISE NOTICE 'Renamed protein_grams column to protein_target_grams';
            ELSE
                -- Add protein_target_grams column
                ALTER TABLE nutrition_goals ADD COLUMN protein_target_grams INTEGER;
                RAISE NOTICE 'Added protein_target_grams column';
            END IF;
        END IF;

        -- Check if carbs_target_grams column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'carbs_target_grams'
        ) THEN
            -- Check if carbs_grams column exists (old name)
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'nutrition_goals' AND column_name = 'carbs_grams'
            ) THEN
                -- Rename carbs_grams to carbs_target_grams
                ALTER TABLE nutrition_goals RENAME COLUMN carbs_grams TO carbs_target_grams;
                RAISE NOTICE 'Renamed carbs_grams column to carbs_target_grams';
            ELSE
                -- Add carbs_target_grams column
                ALTER TABLE nutrition_goals ADD COLUMN carbs_target_grams INTEGER;
                RAISE NOTICE 'Added carbs_target_grams column';
            END IF;
        END IF;

        -- Check if fat_target_grams column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'fat_target_grams'
        ) THEN
            -- Check if fat_grams column exists (old name)
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'nutrition_goals' AND column_name = 'fat_grams'
            ) THEN
                -- Rename fat_grams to fat_target_grams
                ALTER TABLE nutrition_goals RENAME COLUMN fat_grams TO fat_target_grams;
                RAISE NOTICE 'Renamed fat_grams column to fat_target_grams';
            ELSE
                -- Add fat_target_grams column
                ALTER TABLE nutrition_goals ADD COLUMN fat_target_grams INTEGER;
                RAISE NOTICE 'Added fat_target_grams column';
            END IF;
        END IF;

        -- Check if sync_id column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'sync_id'
        ) THEN
            -- Add sync_id column
            ALTER TABLE nutrition_goals ADD COLUMN sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid();
            RAISE NOTICE 'Added sync_id column';
        END IF;

        -- Check if is_deleted column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'is_deleted'
        ) THEN
            -- Add is_deleted column
            ALTER TABLE nutrition_goals ADD COLUMN is_deleted BOOLEAN DEFAULT false;
            RAISE NOTICE 'Added is_deleted column';
        END IF;

        -- Check if start_date column exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'nutrition_goals' AND column_name = 'start_date'
        ) THEN
            -- Add start_date column
            ALTER TABLE nutrition_goals ADD COLUMN start_date DATE;
            RAISE NOTICE 'Added start_date column';
        END IF;

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);
        CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
        CREATE INDEX IF NOT EXISTS idx_nutrition_goals_start_date ON nutrition_goals(start_date);

        RAISE NOTICE 'Nutrition goals table schema updated successfully';
    ELSE
        -- Create the nutrition_goals table if it doesn't exist
        CREATE TABLE nutrition_goals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            daily_calorie_target INTEGER,
            protein_target_grams INTEGER,
            carbs_target_grams INTEGER,
            fat_target_grams INTEGER,
            start_date DATE,
            sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX idx_nutrition_goals_user_id ON nutrition_goals(user_id);
        CREATE INDEX idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
        CREATE INDEX idx_nutrition_goals_start_date ON nutrition_goals(start_date);

        RAISE NOTICE 'Created nutrition_goals table with correct schema';
    END IF;
END $$;

-- Print the current schema of the nutrition_goals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nutrition_goals'
ORDER BY ordinal_position;