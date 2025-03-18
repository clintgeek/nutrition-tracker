const { createClient } = require('redis');
const logger = require('../utils/logger');

// Determine which Redis configuration to use based on environment
const isProduction = process.env.NODE_ENV === 'production';
const redisConfig = {
  url: `redis://${isProduction ? process.env.SERVER_REDIS_HOST : process.env.REDIS_HOST}:${isProduction ? process.env.SERVER_REDIS_PORT : process.env.REDIS_PORT}`,
  password: isProduction ? process.env.SERVER_REDIS_PASSWORD : process.env.REDIS_PASSWORD,
};

const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info(`Connected to Redis at ${redisConfig.url}`);
});

// Connect to Redis
redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

const redisService = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  async set(key, value, options = {}) {
    try {
      const serializedValue = JSON.stringify(value);
      if (options.ttl) {
        await redisClient.setEx(key, options.ttl, serializedValue);
      } else {
        await redisClient.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  },

  async clear() {
    try {
      await redisClient.flushAll();
    } catch (error) {
      logger.error('Redis clear error:', error);
    }
  },

  // Helper function to generate cache keys
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  },
};

module.exports = redisService;