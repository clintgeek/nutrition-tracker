-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  weight_value DECIMAL(10, 2) NOT NULL, -- Weight in kg or lbs
  log_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL, -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Weight goals table
CREATE TABLE IF NOT EXISTS weight_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  target_weight DECIMAL(10, 2) NOT NULL, -- Target weight in kg or lbs
  start_weight DECIMAL(10, 2), -- Starting weight in kg or lbs
  start_date DATE NOT NULL,
  target_date DATE, -- Optional target date
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL, -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_sync_id ON weight_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user ON weight_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_sync_id ON weight_goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_start_date ON weight_goals(start_date);