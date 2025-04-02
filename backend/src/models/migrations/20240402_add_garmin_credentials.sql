-- Migration: Add Garmin credentials columns
-- Date: 2024-04-02

-- Add username and password columns to garmin_connections table
ALTER TABLE garmin_connections
ADD COLUMN username TEXT,
ADD COLUMN password TEXT;