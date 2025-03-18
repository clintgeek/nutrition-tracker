-- Add start_date column to nutrition_goals table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_goals' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE nutrition_goals ADD COLUMN start_date DATE;
        CREATE INDEX IF NOT EXISTS idx_nutrition_goals_start_date ON nutrition_goals(start_date);
        UPDATE nutrition_goals SET start_date = CURRENT_DATE WHERE start_date IS NULL;
    END IF;
END $$;

-- Record migration version
INSERT INTO migration_versions (version) VALUES ('v1.0.4');