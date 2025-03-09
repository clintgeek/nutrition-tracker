const { Pool } = require('pg');

// Get the DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;
console.log('Database URL:', databaseUrl);

// Create a connection pool using individual parameters
const match = databaseUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = match;

// Decode any URL-encoded characters in the password
const decodedPassword = decodeURIComponent(password);

console.log(`Connecting to ${database} on ${host}:${port} as ${user}`);

const pool = new Pool({
  user,
  password: decodedPassword,
  host,
  port: parseInt(port, 10),
  database
});

async function createTables() {
  try {
    console.log('Connecting to database...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Users table created successfully');
    
    // Create food_items table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        calories_per_serving INTEGER NOT NULL,
        protein_grams DECIMAL(10, 2),
        carbs_grams DECIMAL(10, 2),
        fat_grams DECIMAL(10, 2),
        serving_size VARCHAR(50),
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Food items table created successfully');
    
    // Create food_logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        food_item_id INTEGER REFERENCES food_items(id) NOT NULL,
        log_date DATE NOT NULL,
        meal_type VARCHAR(20) NOT NULL,
        servings DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Food logs table created successfully');
    
    // Create nutrition_goals table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
        calories INTEGER,
        protein_grams INTEGER,
        carbs_grams INTEGER,
        fat_grams INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Nutrition goals table created successfully');
    
    // Add some sample food items
    await pool.query(`
      INSERT INTO food_items (name, calories_per_serving, protein_grams, carbs_grams, fat_grams, serving_size)
      VALUES 
        ('Oatmeal with Berries', 350, 12, 60, 8, '1 bowl'),
        ('Grilled Chicken Salad', 450, 35, 20, 25, '1 plate'),
        ('Protein Shake', 200, 30, 10, 3, '1 shake')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('Sample food items added successfully');
    
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await pool.end();
  }
}

createTables();
