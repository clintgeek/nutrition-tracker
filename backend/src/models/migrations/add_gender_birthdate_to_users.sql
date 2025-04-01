-- Add gender and birthdate fields to users if they don't exist
DO $$
BEGIN
    -- Check if gender column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'gender'
    ) THEN
        -- Add gender column with validation
        ALTER TABLE users ADD COLUMN gender VARCHAR(20);
        ALTER TABLE users ADD CONSTRAINT users_gender_check
            CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
    END IF;

    -- Check if birthdate column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'birthdate'
    ) THEN
        -- Add birthdate column
        ALTER TABLE users ADD COLUMN birthdate DATE;
    END IF;
END $$;

-- Create index on gender for potential filtering/reporting
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

-- Create index on birthdate for age calculations and filtering
CREATE INDEX IF NOT EXISTS idx_users_birthdate ON users(birthdate);