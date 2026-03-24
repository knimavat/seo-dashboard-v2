import Redis from 'ioredis';

declare global {
  var __redis_client: Redis | undefined;
  var __redis_available: boolean;
}

if (typeof global.__redis_available === 'undefined') {
  global.__redis_available = false;
}

export function getRedis(): Redis {
  if (!global.__redis_client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      global.__redis_available = false;
      return null as any;
    }

    global.__redis_client = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });

    global.__redis_client.on('connect', () => { global.__redis_available = true; });
    global.__redis_client.on('error', () => { global.__redis_available = false; });
    global.__redis_client.on('close', () => { global.__redis_available = false; });

    global.__redis_client.connect().catch(() => {});
  }
  return global.__redis_client;
}

export function isRedisAvailable(): boolean {
  return global.__redis_available;
}
