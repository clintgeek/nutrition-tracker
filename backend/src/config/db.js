const { Pool } = require('pg');
const logger = require('./logger');

// Create a new pool instance using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  database: process.env.POSTGRES_DB,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool events
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL error:', err);
});

// Get a client from the pool
async function getClient() {
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    logger.error('Error getting client:', err);
    throw err;
  }
}

module.exports = {
  query: (text, params) => {
    logger.debug(`Executing query: ${text}`);
    return pool.query(text, params);
  },
  getPool: () => pool,
  getClient
};