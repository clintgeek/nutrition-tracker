-- Create weight_goals table
CREATE TABLE IF NOT EXISTS weight_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_weight NUMERIC(5, 1) NOT NULL,
  start_weight NUMERIC(5, 1) NOT NULL,
  start_date DATE NOT NULL,
  target_date DATE,
  sync_id VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for weight_goals
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_id ON weight_goals(user_id);

-- Create weight_logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight NUMERIC(5, 1) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  sync_id VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for weight_logs
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id);

-- Create index on date for weight_logs
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(date);