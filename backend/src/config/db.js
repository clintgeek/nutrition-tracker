const { Pool } = require('pg');
const logger = require('./logger');

// Load environment variables
const {
  DB_USER = 'nutrition_user',
  DB_PASSWORD = 'nutrition_password',
  DB_HOST = 'postgres',
  DB_PORT = 5432,
  DB_NAME = 'nutrition_tracker'
} = process.env;

// Create a new pool instance
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Test the connection
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL error:', err);
});

// Export a query function
module.exports = {
  query: (text, params) => {
    logger.debug(`Executing query: ${text}`);
    return pool.query(text, params);
  },
  getPool: () => pool,
};