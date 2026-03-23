import Redis from 'ioredis';
import { getEnv } from './env.js';
import { logger } from './logger.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis {
  if (!redis) {
    const env = getEnv();
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });

    redis.on('connect', () => { redisAvailable = true; logger.info('✅ Redis connected'); });
    redis.on('error', () => { redisAvailable = false; }); // Silent — no spam
    redis.on('close', () => { redisAvailable = false; });

    // Try to connect but don't block startup
    redis.connect().catch(() => {
      logger.warn('Redis unavailable — rate limiting and session blacklist disabled');
    });
  }
  return redis;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}