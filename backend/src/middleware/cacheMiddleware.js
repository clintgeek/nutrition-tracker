const redisService = require('../services/redisService');

const cacheMiddleware = (config = {}) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = redisService.generateKey(
      config.keyPrefix || 'route',
      req.originalUrl
    );

    try {
      const cachedData = await redisService.get(key);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(data) {
        redisService.set(key, data, { ttl: config.ttl });
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = cacheMiddleware;