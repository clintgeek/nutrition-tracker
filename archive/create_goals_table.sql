-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    daily_calorie_target INTEGER NOT NULL,
    protein_target_grams INTEGER,
    carbs_target_grams INTEGER,
    fat_target_grams INTEGER,
    start_date DATE,
    end_date DATE,
    sync_id VARCHAR(36) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Create index on sync_id for faster sync operations
CREATE INDEX IF NOT EXISTS idx_goals_sync_id ON goals(sync_id);

-- Create index on start_date and end_date for date range queries
CREATE INDEX IF NOT EXISTS idx_goals_date_range ON goals(start_date, end_date);

-- Insert a default goal for testing
INSERT INTO goals (
    user_id,
    daily_calorie_target,
    protein_target_grams,
    carbs_target_grams,
    fat_target_grams,
    start_date,
    sync_id
) VALUES (
    1,
    2000,
    120,
    200,
    65,
    CURRENT_DATE,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;