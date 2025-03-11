#!/bin/bash

# Create a temporary file with the updated schema SQL
cat > /tmp/01-schema.sql << 'EOF'
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
  brand VARCHAR(255),
  barcode VARCHAR(100),
  calories_per_serving DECIMAL(10, 2),
  protein_grams DECIMAL(10, 2),
  carbs_grams DECIMAL(10, 2),
  fat_grams DECIMAL(10, 2),
  serving_size DECIMAL(10, 2),
  serving_unit VARCHAR(50),
  source VARCHAR(50),
  source_id VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food log entries table
CREATE TABLE IF NOT EXISTS food_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  food_item_id INTEGER REFERENCES food_items(id),
  date DATE NOT NULL,
  meal_type VARCHAR(50),
  quantity DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id UUID NOT NULL,
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
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id UUID NOT NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);
CREATE INDEX IF NOT EXISTS idx_food_items_source_id ON food_items(source, source_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_id_date ON food_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_logs_sync_id ON food_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_date_range ON nutrition_goals(start_date, end_date);
EOF

# Upload the updated schema SQL file to the server
sftp server << EOF
put /tmp/01-schema.sql /mnt/Media/Docker/nutrition-tracker/backend/init-scripts/01-schema.sql
exit
EOF

# Clean up
rm /tmp/01-schema.sql

# Also update the initDb.js file to handle the case where the file doesn't exist
cat > /tmp/initDb.js << 'EOF'
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Initialize the database with schema
 */
async function initializeDatabase() {
  // Database connection parameters
  const {
    DB_USER = 'nutrition_user',
    DB_PASSWORD = 'Tz7Jd$5pQ8vR2xH3bL9#mN6*kF4gS',
    DB_HOST = 'db',
    DB_PORT = 5432,
    DB_NAME = 'nutrition_tracker'
  } = process.env;

  // Create a new pool
  const pool = new Pool({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Connect to the database
    const client = await pool.connect();
    logger.info('Connected to PostgreSQL database for initialization');

    // Define the schema SQL directly in case the file doesn't exist
    const schemaSql = `
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
      brand VARCHAR(255),
      barcode VARCHAR(100),
      calories_per_serving DECIMAL(10, 2),
      protein_grams DECIMAL(10, 2),
      carbs_grams DECIMAL(10, 2),
      fat_grams DECIMAL(10, 2),
      serving_size DECIMAL(10, 2),
      serving_unit VARCHAR(50),
      source VARCHAR(50),
      source_id VARCHAR(100),
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Food log entries table
    CREATE TABLE IF NOT EXISTS food_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      food_item_id INTEGER REFERENCES food_items(id),
      date DATE NOT NULL,
      meal_type VARCHAR(50),
      quantity DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sync_id UUID NOT NULL,
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
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sync_id UUID NOT NULL,
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

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
    CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);
    CREATE INDEX IF NOT EXISTS idx_food_items_source_id ON food_items(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_food_logs_user_id_date ON food_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_food_logs_sync_id ON food_logs(sync_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_goals_sync_id ON nutrition_goals(sync_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_goals_date_range ON nutrition_goals(start_date, end_date);
    `;

    // Execute the schema SQL
    logger.info('Initializing database schema...');
    await client.query(schemaSql);
    logger.info('Database schema initialized successfully');

    // Release the client
    client.release();
  } catch (err) {
    logger.error('Error initializing database:', err);
  } finally {
    // Close the pool
    await pool.end();
  }
}

module.exports = { initializeDatabase };
EOF

# Upload the updated initDb.js file to the server
sftp server << EOF
put /tmp/initDb.js /mnt/Media/Docker/nutrition-tracker/backend/src/config/initDb.js
exit
EOF

# Clean up
rm /tmp/initDb.js

echo "Database initialization scripts updated with correct table names!"