import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export const cacheMiddleware = (config: CacheConfig = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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
      res.json = function(data: any) {
        redisService.set(key, data, { ttl: config.ttl });
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default cacheMiddleware;