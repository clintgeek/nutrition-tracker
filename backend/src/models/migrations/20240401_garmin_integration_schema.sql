-- Migration: Create Garmin Integration Tables
-- Date: 2024-04-01

-- Table for storing Garmin user connections
CREATE TABLE IF NOT EXISTS garmin_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    username TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Table for storing Garmin activities
CREATE TABLE IF NOT EXISTS garmin_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    garmin_activity_id TEXT NOT NULL,
    activity_name TEXT,
    activity_type TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    distance_meters NUMERIC(10, 2),
    calories INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    steps INTEGER,
    elevation_gain NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, garmin_activity_id)
);

-- Table for storing daily activity summaries
CREATE TABLE IF NOT EXISTS garmin_daily_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_steps INTEGER,
    total_distance_meters NUMERIC(10, 2),
    total_calories INTEGER,
    active_calories INTEGER,
    bmr_calories INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    resting_heart_rate INTEGER,
    avg_stress_level INTEGER,
    floor_climbed INTEGER,
    minutes_sedentary INTEGER,
    minutes_lightly_active INTEGER,
    minutes_moderately_active INTEGER,
    minutes_highly_active INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_garmin_activities_user_id ON garmin_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_garmin_activities_start_time ON garmin_activities(start_time);
CREATE INDEX IF NOT EXISTS idx_garmin_daily_summaries_user_id ON garmin_daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_garmin_daily_summaries_date ON garmin_daily_summaries(date);

-- Add this comment as documentation for future reference
COMMENT ON TABLE garmin_connections IS 'Stores user connections to Garmin. Note: access_token, refresh_token, and token_expires_at can be NULL for implementations that store Garmin username/password directly.';