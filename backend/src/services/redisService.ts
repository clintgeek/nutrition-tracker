import { createClient } from 'redis';
import logger from '../utils/logger';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

// Connect to Redis
redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export const redisService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
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

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await redisClient.flushAll();
    } catch (error) {
      logger.error('Redis clear error:', error);
    }
  },

  // Helper function to generate cache keys
  generateKey(prefix: string, ...parts: any[]): string {
    return `${prefix}:${parts.join(':')}`;
  },
};

export default redisService;