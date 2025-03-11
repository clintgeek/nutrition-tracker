-- Add start_date column to nutrition_goals table if it doesn't exist
DO $$
BEGIN
    -- Check if start_date column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'nutrition_goals' AND column_name = 'start_date'
    ) THEN
        -- Add start_date column
        ALTER TABLE nutrition_goals ADD COLUMN start_date DATE;

        -- Set default value for existing rows (current date)
        UPDATE nutrition_goals SET start_date = CURRENT_DATE WHERE start_date IS NULL;
    END IF;
END $$;

-- Print the current schema of the nutrition_goals table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nutrition_goals'
ORDER BY ordinal_position;