-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food items table
CREATE TABLE IF NOT EXISTS food_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  calories_per_serving DECIMAL(10, 2),
  protein_grams DECIMAL(10, 2),
  carbs_grams DECIMAL(10, 2),
  fat_grams DECIMAL(10, 2),
  serving_size VARCHAR(100),
  serving_unit VARCHAR(50),
  source VARCHAR(50), -- API or custom
  source_id VARCHAR(100), -- ID from external API if applicable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- User food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  food_item_id INTEGER REFERENCES food_items(id),
  log_date DATE NOT NULL,
  meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
  servings DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL, -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Nutrition goals table
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  daily_calorie_target INTEGER,
  protein_target_grams INTEGER,
  carbs_target_grams INTEGER,
  fat_target_grams INTEGER,
  start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(), -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

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

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL,
  last_sync_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user ON nutrition_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_start_date ON nutrition_goals(start_date);
CREATE INDEX IF NOT EXISTS idx_food_items_is_deleted ON food_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_sync_id ON weight_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user ON weight_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_sync_id ON weight_goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_weight_goals_start_date ON weight_goals(start_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_sync_id ON meal_plans(sync_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_is_deleted ON meal_plans(is_deleted);