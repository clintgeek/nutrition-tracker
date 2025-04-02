const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create a connection pool using environment variables
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || 5432,
});

// Log connection info for debugging
logger.info(`Connecting to PostgreSQL database at ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432} as ${process.env.POSTGRES_USER}`);

// Setup error handling on the pool
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Error connecting to PostgreSQL database:', err);
  } else {
    logger.info('Connected to PostgreSQL database');
  }
});

// Export the pool
module.exports = {
  query: (text, params) => {
    logger.debug(`Executing query: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
    return pool.query(text, params);
  },
  getClient: () => pool.connect(),
  pool
};