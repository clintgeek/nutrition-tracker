-- Migration: Update Garmin connections schema
-- Date: 2024-04-02

-- Make access_token and refresh_token nullable
ALTER TABLE garmin_connections
ALTER COLUMN access_token DROP NOT NULL,
ALTER COLUMN refresh_token DROP NOT NULL,
ALTER COLUMN expires_at DROP NOT NULL;

-- Rename expires_at to token_expires_at for consistency
ALTER TABLE garmin_connections
RENAME COLUMN expires_at TO token_expires_at;

-- Add last_sync_time column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'garmin_connections' AND column_name = 'last_sync_time'
    ) THEN
        ALTER TABLE garmin_connections
        ADD COLUMN last_sync_time TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add username and password columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'garmin_connections' AND column_name = 'username'
    ) THEN
        ALTER TABLE garmin_connections
        ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'garmin_connections' AND column_name = 'password'
    ) THEN
        ALTER TABLE garmin_connections
        ADD COLUMN password TEXT;
    END IF;
END $$;

-- Add created_at and updated_at columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'garmin_connections' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE garmin_connections
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'garmin_connections' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE garmin_connections
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;