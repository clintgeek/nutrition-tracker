const { Pool } = require('pg');
const logger = require('../config/logger');

// Create a database connection pool
function getPool() {
  // Parse the DATABASE_URL environment variable
  const databaseUrl = process.env.DATABASE_URL;
  
  try {
    // Extract connection details using regex instead of URL parsing
    const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = databaseUrl.match(regex);
    
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = match;
    
    // Create pool with individual parameters
    return new Pool({
      user,
      password,
      host,
      port: parseInt(port, 10),
      database,
      ssl: false
    });
  } catch (err) {
    logger.error(`Error creating database pool: ${err.message}`);
    
    // Fallback to direct connection parameters
    return new Pool({
      user: process.env.POSTGRES_USER || 'nutrition_user',
      password: process.env.POSTGRES_PASSWORD || 'your_secure_password_here',
      host: 'db',
      port: 5432,
      database: process.env.POSTGRES_DB || 'nutrition_tracker',
      ssl: false
    });
  }
}

module.exports = {
  getPool
};
