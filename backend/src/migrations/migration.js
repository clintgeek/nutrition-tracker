const { Pool } = require('pg');
const logger = require('../config/logger');

// Log environment variables
console.log('Database connection details:');
console.log('User:', process.env.POSTGRES_USER);
console.log('Host:', process.env.POSTGRES_HOST);
console.log('Port:', process.env.POSTGRES_PORT);
console.log('Database:', process.env.POSTGRES_DB);

// Create a new pool instance using environment variables
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'nutrition_user',
  password: process.env.POSTGRES_PASSWORD || 'nutrition123',
  host: 'nutrition-tracker-db-1',  // Use the Docker service name
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'nutrition_tracker',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function createTables() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Begin transaction
    await client.query('BEGIN');

    // Enable pg_trgm extension
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // Create migration_versions table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if this migration has been applied
    const { rows } = await client.query(
      "SELECT version FROM migration_versions WHERE version = 'v1.0.0'"
    );

    if (rows.length > 0) {
      console.log('Migration v1.0.0 has already been applied');
      await client.query('COMMIT');
      return;
    }

    // Drop and recreate users table
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add indexes for better performance
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_created_at ON users(created_at);
    `);

    console.log('Users table created successfully');

    // Create food_items table
    await client.query('DROP TABLE IF EXISTS food_items CASCADE');
    await client.query(`
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

      -- Add indexes for better performance
      CREATE INDEX idx_food_items_user_id ON food_items(user_id);
      CREATE INDEX idx_food_items_barcode ON food_items(barcode);
      CREATE INDEX idx_food_items_name ON food_items(name);
      CREATE INDEX idx_food_items_is_deleted ON food_items(is_deleted);
      CREATE INDEX idx_food_items_name_gin ON food_items USING gin (name gin_trgm_ops);
    `);

    console.log('Food items table created successfully');

    // Create food_logs table
    await client.query('DROP TABLE IF EXISTS food_logs CASCADE');
    await client.query(`
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

      -- Add indexes for better performance
      CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
      CREATE INDEX idx_food_logs_food_item_id ON food_logs(food_item_id);
      CREATE INDEX idx_food_logs_log_date ON food_logs(log_date);
      CREATE INDEX idx_food_logs_meal_type ON food_logs(meal_type);
    `);

    console.log('Food logs table created successfully');

    // Create nutrition_goals table
    await client.query('DROP TABLE IF EXISTS nutrition_goals CASCADE');
    await client.query(`
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

      -- Add indexes for better performance
      CREATE INDEX idx_nutrition_goals_user_id ON nutrition_goals(user_id);
      CREATE INDEX idx_nutrition_goals_is_deleted ON nutrition_goals(is_deleted);
    `);

    console.log('Nutrition goals table created successfully');

    // Record this migration version
    await client.query(
      "INSERT INTO migration_versions (version) VALUES ('v1.0.0')"
    );

    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');

  } catch (err) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error during migration:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
createTables().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
