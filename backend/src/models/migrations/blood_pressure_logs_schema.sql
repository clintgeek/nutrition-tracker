-- Create blood pressure logs table
CREATE TABLE IF NOT EXISTS blood_pressure_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    systolic INTEGER NOT NULL CHECK (systolic >= 0 AND systolic <= 300),
    diastolic INTEGER NOT NULL CHECK (diastolic >= 0 AND diastolic <= 200),
    pulse INTEGER CHECK (pulse >= 0 AND pulse <= 300),
    log_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_blood_pressure_logs_user_date
ON blood_pressure_logs(user_id, log_date DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blood_pressure_logs_updated_at
    BEFORE UPDATE ON blood_pressure_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();