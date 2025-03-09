-- Check if the nutrition_goals table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'nutrition_goals'
    ) THEN
        -- Check if the end_date column exists
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'nutrition_goals'
            AND column_name = 'end_date'
        ) THEN
            -- Remove the end_date column
            ALTER TABLE nutrition_goals DROP COLUMN IF EXISTS end_date;
            RAISE NOTICE 'Removed end_date column from nutrition_goals table';
        ELSE
            RAISE NOTICE 'end_date column does not exist in nutrition_goals table';
        END IF;
    ELSE
        -- Create the nutrition_goals table if it doesn't exist
        CREATE TABLE nutrition_goals (
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

        -- Create indexes
        CREATE INDEX idx_nutrition_goals_user_id ON nutrition_goals(user_id);
        CREATE INDEX idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
        CREATE INDEX idx_nutrition_goals_start_date ON nutrition_goals(start_date);

        RAISE NOTICE 'Created nutrition_goals table without end_date column';
    END IF;
END $$;