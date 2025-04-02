const { createClient } = require('redis');
const logger = require('../utils/logger');

// Redis configuration
const redisConfig = {
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || '',
};

logger.info(`Connecting to Redis at ${redisConfig.url}`);

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
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  },

  async clear() {
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis clear error:', error);
      return false;
    }
  },

  generateKey(req, prefix = 'cache') {
    const userId = req.user ? req.user.id : 'guest';
    const path = req.originalUrl || req.url;
    return `${prefix}-${userId}-${path}`;
  }
};

module.exports = redisService;