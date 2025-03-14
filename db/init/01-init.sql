-- Enable the pg_trgm extension for text similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create migration_versions table
CREATE TABLE IF NOT EXISTS migration_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Create food_items table
DROP TABLE IF EXISTS food_items CASCADE;
CREATE TABLE food_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  calories_per_serving INTEGER NOT NULL,
  protein_grams DECIMAL(10, 2),
  carbs_grams DECIMAL(10, 2),
  fat_grams DECIMAL(10, 2),
  serving_size VARCHAR(50),
  serving_unit VARCHAR(50),
  source VARCHAR(50),
  source_id VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for food_items
CREATE INDEX idx_food_items_user_id ON food_items(user_id);
CREATE INDEX idx_food_items_barcode ON food_items(barcode);
CREATE INDEX idx_food_items_name ON food_items(name);
CREATE INDEX idx_food_items_is_deleted ON food_items(is_deleted);
CREATE INDEX idx_food_items_name_gin ON food_items USING gin (name gin_trgm_ops);

-- Create food_logs table
DROP TABLE IF EXISTS food_logs CASCADE;
CREATE TABLE food_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  food_item_id INTEGER NOT NULL,
  log_date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  servings DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_food_item FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Add indexes for food_logs
CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_food_item_id ON food_logs(food_item_id);
CREATE INDEX idx_food_logs_log_date ON food_logs(log_date);
CREATE INDEX idx_food_logs_meal_type ON food_logs(meal_type);

-- Create nutrition_goals table
DROP TABLE IF EXISTS nutrition_goals CASCADE;
CREATE TABLE nutrition_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_goals UNIQUE (user_id, is_deleted)
);

-- Add indexes for nutrition_goals
CREATE INDEX idx_nutrition_goals_user_id ON nutrition_goals(user_id);
CREATE INDEX idx_nutrition_goals_is_deleted ON nutrition_goals(is_deleted);

-- Create recipes table
DROP TABLE IF EXISTS recipes CASCADE;
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER NOT NULL DEFAULT 1,
    total_calories DECIMAL(10, 2),
    total_protein_grams DECIMAL(10, 2),
    total_carbs_grams DECIMAL(10, 2),
    total_fat_grams DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create recipe_ingredients table for the ingredients in each recipe
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL,
    food_item_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_id VARCHAR(36) NOT NULL DEFAULT gen_random_uuid(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT fk_food_item FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Add recipe-related indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_sync_id ON recipes(sync_id);
CREATE INDEX idx_recipes_is_deleted ON recipes(is_deleted);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_food_item_id ON recipe_ingredients(food_item_id);
CREATE INDEX idx_recipe_ingredients_order ON recipe_ingredients(recipe_id, order_index);

-- Add recipe_id to food_items for recipe-derived food items
ALTER TABLE food_items ADD COLUMN recipe_id INTEGER REFERENCES recipes(id);
CREATE INDEX idx_food_items_recipe_id ON food_items(recipe_id);

-- Record migration version
INSERT INTO migration_versions (version) VALUES ('v1.0.0');